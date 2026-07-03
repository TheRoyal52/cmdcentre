import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGeminiChatSession } from '../lib/gemini';
import { Send, Bot, User, Sparkles, Loader2, Trash2, Copy, Check, X } from 'lucide-react';
import {
  collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

/* ─── Copy Button ─────────────────────────────────────────────────────────── */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] font-mono text-[#475569] hover:text-[#94A3B8] transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

/* ─── Markdown renderer ────────────────────────────────────────────────────── */
const renderMarkdown = (text: string, isStreaming = false): React.ReactNode => {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">
          {renderInline(text.slice(lastIndex, match.index))}
        </span>,
      );
    }
    const lang = match[1] || 'code';
    const code = match[2].trim();
    parts.push(
      <div key={key++} className="code-block-wrapper my-2">
        <div className="code-block-header">
          <span>{lang}</span>
          <CopyButton text={code} />
        </div>
        <pre className="code-block-pre">
          <code>{code}</code>
        </pre>
      </div>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap">
        {renderInline(text.slice(lastIndex))}
        {isStreaming && <span className="inline-block w-0.5 h-3.5 bg-[#A78BFA] ml-0.5 align-middle animate-pulse" />}
      </span>,
    );
  }

  return <div className="leading-relaxed space-y-0.5">{parts}</div>;
};

const renderInline = (text: string): React.ReactNode => {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="font-mono text-[11px] bg-[#18181F] border border-[#1E1E2E] px-1.5 py-0.5 rounded text-[#38BDF8]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-[#F1F5F9]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

/* ─── Quick prompts ───────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  { label: 'Induction Motor faults',    text: 'Explain 3-Phase Induction Motor faults in simple terms' },
  { label: 'Java Arrays interview',      text: 'Mock SDE interview me on Java Arrays — ask 3 progressively harder questions' },
  { label: 'Control Systems damping',   text: 'Explain underdamped, overdamped and critically damped systems with examples' },
  { label: 'React useEffect bugs',      text: 'Explain the most common React useEffect bugs and how to fix them' },
  { label: 'Power System faults',       text: 'Explain Power System Fault Analysis: types of faults and their effects' },
  { label: 'Big-O cheatsheet',          text: 'Give me a concise Big-O complexity cheatsheet for common data structures' },
];

/* ─── Main component ──────────────────────────────────────────────────────── */
export const GeminiChatbot: React.FC = () => {
  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [streamingText,  setStreamingText]  = useState<string | null>(null); // live streamed text
  const [chatSession,    setChatSession]    = useState<ReturnType<typeof getGeminiChatSession> | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setChatSession(getGeminiChatSession());
      setError(null);
    } catch {
      setError('Gemini API key missing. Set VITE_GEMINI_API_KEY in .env.local');
    }

    const q = query(collection(db, 'chatHistory'), orderBy('timestamp', 'asc'), limit(120));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingText]);

  // Auto-resize textarea
  const autoResize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const clearHistory = async () => {
    const snap = await getDocs(collection(db, 'chatHistory'));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    try { setChatSession(getGeminiChatSession()); } catch {}
    toast.success('Chat history cleared.');
  };

  // Keyboard shortcut: Ctrl+L to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        clearHistory();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (!chatSession) { setError('Gemini session not initialized. Check your API key.'); return; }

    setInput('');
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    setIsLoading(true);
    setError(null);

    const ts = new Date().toISOString();
    await addDoc(collection(db, 'chatHistory'), { role: 'user', text: trimmed, timestamp: ts });

    try {
      // ── STREAMING ──────────────────────────────────────────────────────────
      const stream = await chatSession.sendMessageStream(trimmed);
      let fullText = '';
      setStreamingText('');

      for await (const chunk of stream) {
        const delta = chunk.text();
        fullText += delta;
        setStreamingText(fullText);
        // smooth scroll as tokens arrive
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      setStreamingText(null);
      await addDoc(collection(db, 'chatHistory'), {
        role: 'model', text: fullText, timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      setStreamingText(null);
      const msg = err?.message?.includes('API_KEY')
        ? 'Invalid Gemini API key. Check your .env.local file.'
        : 'Gemini request failed. Try again.';
      setError(msg);
      await addDoc(collection(db, 'chatHistory'), {
        role: 'model', text: `Error: ${msg}`, timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, chatSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const fmtRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="flex flex-col h-full bg-[#111118] border border-[#1E1E2E] rounded-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E] bg-[#0D0D12] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#A78BFA]/12 border border-[#A78BFA]/25 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#A78BFA]" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-[#F1F5F9]">EE Viva & SDE Mentor</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={twMerge('w-1.5 h-1.5 rounded-full', isLoading ? 'bg-[#F59E0B] animate-pulse' : 'bg-[#10B981]')} />
              <p className="text-[11px] text-[#A78BFA] font-mono">
                Gemini 2.5 Flash · {isLoading ? 'Streaming…' : 'Ready'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1.5 text-[11px] text-[#475569] hover:text-red-400 hover:bg-red-500/8 px-2.5 py-1.5 rounded-md transition-all border border-transparent hover:border-red-500/15"
          aria-label="Clear chat history (Ctrl+L)"
          title="Clear history (Ctrl+L)"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-500/8 border border-red-500/20 rounded-md text-[12px] text-red-400 font-medium shrink-0 flex items-start gap-2">
          <span className="mt-0.5">⚠</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400" aria-label="Dismiss error">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && streamingText === null && (
          <div className="text-center mt-12 select-none">
            <div className="w-14 h-14 bg-[#A78BFA]/8 border border-[#A78BFA]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-[#A78BFA] opacity-60" />
            </div>
            <p className="text-[#475569] text-sm font-medium">Ask me anything about DSA, EE, or system design.</p>
            <p className="text-[#334155] text-xs mt-1">Try the quick prompts below, or press Enter to send.</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={twMerge(
              'flex gap-2.5 max-w-[92%] msg-enter',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto',
            )}
          >
            {/* Avatar */}
            <div className={twMerge(
              'w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border',
              msg.role === 'user'
                ? 'bg-[#6366F1]/12 border-[#6366F1]/25 text-[#818CF8]'
                : 'bg-[#A78BFA]/12 border-[#A78BFA]/25 text-[#A78BFA]',
            )}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={twMerge(
              'px-3.5 py-2.5 rounded-lg text-sm min-w-0 overflow-hidden',
              msg.role === 'user'
                ? 'bg-[#6366F1]/12 border border-[#6366F1]/20 text-[#E2E8F0] rounded-tr-sm'
                : 'bg-[#18181F] border border-[#1E1E2E] text-[#94A3B8] rounded-tl-sm',
            )}>
              {renderMarkdown(msg.text)}
              <p className="text-[10px] text-[#334155] font-mono mt-1.5 text-right" title={fmtTime(msg.timestamp)}>
                {fmtRelative(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Live streaming bubble */}
        {streamingText !== null && (
          <div className="flex gap-2.5 max-w-[92%] mr-auto msg-enter">
            <div className="w-7 h-7 rounded-md bg-[#A78BFA]/12 border border-[#A78BFA]/25 text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-3.5 py-2.5 rounded-lg rounded-tl-sm bg-[#18181F] border border-[#A78BFA]/20 text-[#94A3B8] text-sm min-w-0 overflow-hidden">
              {streamingText.length > 0
                ? renderMarkdown(streamingText, true)
                : (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                    <span className="text-[12px] text-[#475569]">Thinking…</span>
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* Fallback typing indicator when session is starting */}
        {isLoading && streamingText === null && (
          <div className="flex gap-2.5 max-w-[92%] mr-auto msg-enter">
            <div className="w-7 h-7 rounded-md bg-[#A78BFA]/12 border border-[#A78BFA]/25 text-[#A78BFA] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-3.5 py-3 rounded-lg rounded-tl-sm bg-[#18181F] border border-[#1E1E2E] flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-[#A78BFA] rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              <span className="text-[12px] text-[#475569]">Connecting…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2.5 border-t border-[#1E1E2E] bg-[#0D0D12] shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => handleSend(p.text)}
              disabled={isLoading}
              className="whitespace-nowrap text-[11px] bg-[#111118] border border-[#1E1E2E] text-[#475569] hover:text-[#A78BFA] hover:border-[#A78BFA]/30 hover:bg-[#A78BFA]/6 px-2.5 py-1.5 rounded-md transition-all disabled:opacity-40 font-mono shrink-0"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 bg-[#0D0D12] border-t border-[#1E1E2E] shrink-0">
        <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about DSA, EE theory, debugging… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="w-full bg-[#1F1F2A] border border-[#1E1E2E] focus:border-[#6366F1] rounded-md px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none transition-colors resize-none leading-relaxed"
              style={{ minHeight: '40px', maxHeight: '160px' }}
              aria-label="Message input"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 flex items-center justify-center bg-[#6366F1] hover:bg-[#818CF8] active:scale-95 disabled:bg-[#1F1F2A] disabled:text-[#334155] text-white rounded-md transition-all shrink-0"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
        <p className="text-[10px] text-[#334155] font-mono mt-1.5 px-0.5">↵ send · ⇧↵ newline · Ctrl+L clear</p>
      </div>
    </div>
  );
};
