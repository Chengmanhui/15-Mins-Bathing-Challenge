
export interface BathSession {
  id: string;
  timestamp: number;
  durationSeconds: number;
}

export type Language = 'en' | 'zh';

export interface TranslationSet {
  title: string;
  start: string;
  end: string;
  recordSinging: string;
  shameSong: string;
  trends: string;
  summary: string;
  weekly: string;
  monthly: string;
  yearly: string;
  minutes: string;
  seconds: string;
  bathTooLong: string;
  stopRecording: string;
  startRecording: string;
  save: string;
  delete: string;
  noStats: string;
  shameSongDesc: string;
  langToggle: string;
  avgTime: string;
  totalBaths: string;
  overtimeCount: string;
  recentHistory: string;
  waterSaved: string;
}
