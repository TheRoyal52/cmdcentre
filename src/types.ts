// ─── Attendance ───────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  name: string;
  totalClasses: number;
  attendedClasses: number;
  targetPercent: number;
}

export interface AttendanceDay {
  id: string;
  subjectId: string;
  subjectName: string;
  date: string;      // YYYY-MM-DD
  total: number;
  attended: number;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskCategory = 'JAVA_DSA' | 'WEB_DEV' | 'EE';

export interface PlacementTask {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  createdAt?: string;
}

// ─── LeetCode ─────────────────────────────────────────────────────────────────
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface LeetCodeLog {
  id: string;
  problemName: string;
  link: string;
  difficulty: Difficulty;
  dateSolved: string;
}

export interface LeetCodeProfile {
  username: string;
  ranking: number;
  avatar: string;
  realName: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  acceptanceRate: number;
  submissionCalendar: Record<string, number>; // timestamp -> count
  streak: number;
}

// ─── Notes ────────────────────────────────────────────────────────────────────
export interface StudyNote {
  id: string;
  content: string;
  color: 'yellow' | 'cyan' | 'emerald' | 'purple';
  createdAt: string;
}

// ─── Fitness ──────────────────────────────────────────────────────────────────
export type WorkoutType = 'Cardio' | 'Strength' | 'Yoga' | 'HIIT' | 'Other';

export interface WorkoutLog {
  id: string;
  exercise: string;
  duration: number;     // minutes
  type: WorkoutType;
  calories?: number;    // optional kcal burned
  date: string;         // ISO
}

// ─── Diet ─────────────────────────────────────────────────────────────────────
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealLog {
  id: string;
  name: string;
  calories: number;
  mealType: MealType;
  date: string;         // ISO
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  leetcodeUsername: string;
  calorieTarget: number;   // daily kcal goal
  weightKg?: number;
  heightCm?: number;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
export interface StudyPlan {
  plan: string;
  generatedAt: string;
}
