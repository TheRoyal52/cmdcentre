import React, { useState, useEffect, useRef } from 'react';
import { getGeminiChatSession } from '../lib/gemini';
import { Send, Bot, User, Sparkles, Loader2, Trash2 } from 'lucide-react';
import {
  collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { twMerge } from 'tailwind-merge';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

// Simple inline markdown-like renderer (bold, code, line breaks)
const renderText = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Code blocks
    if (line.startsWith('```') || line.endsWith('```')) {
      return <span key={i} className="block font-mono text-xs bg-slate-900 px-2 py-0.5 rounded my-1">{line.replace(/```/g, '')}</span>;
    }
    // Inline code
    const parts = line.split(/(`[^`]+`)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={j} className="font-mono text-xs bg-slate-900 border border-slate-700 px-1 py-0.5 rounded text-cyan-300">{part.slice(1,-1)}</code>;
      }
      // Bold
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, k) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={k} className="font-bold text-slate-100">{bp.slice(2,-2)}</strong>;
        }
        return bp;
      });
    });
    return <span key={i} className="block leading-relaxed">{rendered}{i < lines.length - 1 && line !== '' ? '' : ''}</span>;
  });
};

const QUICK_PROMPTS = [
  { label: '⚡ Induction Motor faults', text: 'Explain 3-Phase Induction Motor faults in simple terms' },
  { label: '☕ Java Arrays interview', text: 'Mock SDE interview me on Java Arrays — ask me 3 progressively harder questions' },
  { label: '🔄 Control Systems damping', text: 'Explain underdamped, overdamped and critically damped systems with examples' },
  { label: '🌐 Debug React hook', text: 'Explain the most common React useEffect bugs and how to fix them' },
  { label: '⚙️ Power System faults', text: 'Explain Power System Fault Analysis: types of faults and their effects' },
  { label: '📊 Big O cheatsheet', text: 'Give me a quick Big-O complexity cheatsheet for common data structures' },
];

export const GeminiChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<ReturnType<typeof getGeminiChatSession> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setChatSession(getGeminiChatSession());
      setError(null);
    } catch (e) {
      setError('Gemini API key missing or invalid. Set VITE_GEMINI_API_KEY in .env.local');
    }

    const q = query(collection(db, 'chatHistory'), orderBy('timestamp', 'asc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const clearHistory = async () => {
    const snapshot = await getDocs(collection(db, 'chatHistory'));
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    // Reset session too
    try { setChatSession(getGeminiChatSession()); } catch (_) {}
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (!chatSession) {
      setError('Gemini session not initialized. Check your API key.');
      return;
    }

    setInput('');
    setIsLoading(true);
    setError(null);

    const ts = new Date().toISOString();
    await addDoc(collection(db, 'chatHistory'), { role: 'user', text: trimmed, timestamp: ts });

    try {
      const result = await chatSession.sendMessage(trimmed);
      const responseText = result.response.text();
      await addDoc(collection(db, 'chatHistory'), {
        role: 'model',
        text: responseText,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      const msg = err?.message?.includes('API_KEY')
        ? 'Invalid Gemini API key. Check your .env.local file.'
        : 'Gemini request failed. Try again.';
      setError(msg);
      await addDoc(collection(db, 'chatHistory'), {
        role: 'model',
        text: `⚠️ ${msg}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/80 bg-slate-800/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">EE Viva & SDE Mentor</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot" />
              <p className="text-xs text-indigo-400 font-medium">Gemini 1.5 Flash — Ready</p>
            </div>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all border border-transparent hover:border-red-500/20"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium shrink-0">
          ⚠️ {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.length === 0 && !isLoading && (
          <div className="text-center mt-10 select-none">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-400 opacity-60" />
            </div>
            <p className="text-slate-400 font-medium text-sm">Ask me anything about SDE prep or EE theory.</p>
            <p className="text-slate-600 text-xs mt-1">Use the quick prompts below to get started.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={twMerge(
              'flex gap-3 max-w-[88%] animate-fade-in',
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto',
            )}
          >
            <div
              className={twMerge(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'user'
                  ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
                  : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400',
              )}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={twMerge(
                'px-4 py-3 rounded-2xl text-sm',
                msg.role === 'user'
                  ? 'bg-cyan-600/15 border border-cyan-500/25 text-slate-200 rounded-tr-sm'
                  : 'bg-slate-800 border border-slate-700/80 text-slate-300 rounded-tl-sm',
              )}
            >
              {renderText(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[88%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700 text-slate-400 flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Thinking<span className="animate-pulse">...</span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => handleSend(p.text)}
              disabled={isLoading}
              className="whitespace-nowrap text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 px-3 py-1.5 rounded-full transition-all disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-3 items-end"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Java, EE theory, debugging..."
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 active:scale-95 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
