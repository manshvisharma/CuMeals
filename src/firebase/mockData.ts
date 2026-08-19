import { DailyMenu, MealTimings, NoticeItem, MessSettings } from '../types';

export const defaultTimings: MealTimings = {
  breakfast: '8:00 AM – 9:30 AM',
  lunch: '12:30 PM – 2:00 PM',
  snacksBoys: '4:30 PM – 5:30 PM (Boys Block)',
  snacksGirls: '4:30 PM – 5:30 PM (Girls Block)',
  dinner: '8:00 PM – 9:30 PM',
  noticeNote: 'Daily nutritious & hygienic meals served as per hostel committee schedule.'
};

export const defaultNotices: NoticeItem[] = [
  {
    id: 'n1',
    title: 'Hostel Mess Notice',
    content: 'Welcome to the Hostel Mess. Menus and timings are managed daily by the mess committee. Please submit any suggestions in the More section.',
    date: '2026-08-19',
    priority: 'normal',
    active: true
  }
];

export const defaultSettings: MessSettings = {
  messName: 'Hostel Mess',
  tagline: 'Fresh, nutritious & hygienic meals for students',
  contactEmail: 'mess@hostel.edu',
  contactPhone: '+91 98765 43210',
  noticeBoardActive: true
};

// Returns empty menu collection - admin can add/manage menus for any date
export function generateMockMenus(): Record<string, DailyMenu> {
  return {};
}
