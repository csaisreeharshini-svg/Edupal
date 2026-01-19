
export enum KnowledgeLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum LearningGoal {
  EXAM_PREP = 'exam prep',
  CONCEPT_UNDERSTANDING = 'concept understanding',
  SKILL_BUILDING = 'skill building'
}

export enum LearningStyle {
  TEXT = 'text',
  VIDEO = 'video',
  QUIZZES = 'quizzes',
  MIXED = 'mixed'
}

export type SessionFeedback = 'easy' | 'medium' | 'hard';

export interface PerformanceData {
  quizScores: number[];
  timeSpentMinutes: number;
  lastFeedback?: SessionFeedback;
  completedTopics: string[];
  averageAccuracy: number;
}

export interface UserProfile {
  name: string;
  classInfo: string; // e.g., Grade 10, Semester 2
  subject: string; // e.g., Physics, Computer Science
  level: KnowledgeLevel;
  goal: LearningGoal;
  style: LearningStyle;
  timePerDay: number;
  topic: string;
  language: string;
  performance: PerformanceData;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'current' | 'completed';
  topics: string[];
  videoUrl?: string;
  sources?: { uri: string; title: string }[];
}

export interface LearningPath {
  modules: Module[];
  estimatedWeeks: number;
  personalizedReasoning: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
