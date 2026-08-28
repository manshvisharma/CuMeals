export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface MealData {
  time: string;
  items: string[];
  description?: string;
}

export interface DailyMenu {
  day?: DayOfWeek;
  date?: string; // YYYY-MM-DD or DayOfWeek string (e.g. 'monday')
  breakfast: MealData;
  lunch: MealData;
  snacksBoys: MealData;
  snacksGirls: MealData;
  dinner: MealData;
  updatedAt?: string;
  updatedBy?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snacksBoys' | 'snacksGirls' | 'dinner';

export interface MealTypeConfig {
  id: MealType;
  title: string;
  icon: string;
  defaultTime: string;
  accentBgLight: string;
  accentBgDark: string;
  accentTextLight: string;
  accentTextDark: string;
  iconColorLight: string;
  iconColorDark: string;
}

export interface MealTimings {
  breakfast: string;
  lunch: string;
  snacksBoys: string;
  snacksGirls: string;
  dinner: string;
  noticeNote?: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'normal' | 'high' | 'urgent';
  active: boolean;
}

export interface MessSettings {
  messName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  noticeBoardActive: boolean;
}

export type ActiveTab = 'menu' | 'timings' | 'timepass' | 'more';

export interface LeaderboardEntry {
  id: string;
  game: 'memory' | 'mathRush';
  playerName: string;
  userId?: string;
  userEmail?: string;
  score: number; // For MathRush: high score. For Memory: least moves (or score formula)
  moves?: number;
  level?: number;
  date: string;
  createdAt?: string;
  weekKey?: string;
}

export interface FeedbackItem {
  id: string;
  message: string;
  userName: string;
  userEmail?: string;
  category?: 'food' | 'hygiene' | 'timing' | 'general';
  rating?: number;
  createdAt: string;
  status?: 'new' | 'reviewed' | 'resolved';
}

