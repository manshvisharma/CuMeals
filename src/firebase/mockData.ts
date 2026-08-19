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
    content: 'Welcome to CuMeals. Menus and timings are managed daily by the mess committee. Please submit any suggestions in the More section.',
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

export const SEEDED_MENUS: DailyMenu[] = [
  {
    date: '2026-08-16',
    day: 'sunday',
    breakfast: { time: '', items: ['Chole Bhature', 'Pickle', 'Green Chilli', 'Tea'] },
    lunch: { time: '', items: ['Veg Biryani', 'Aloo Rasela', 'Mix Raita', 'Penut Chana Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Samosa'] },
    snacksGirls: { time: '', items: ['Tea', 'Tea Cake'] },
    dinner: { time: '', items: ['Matar Paneer', 'Egg Masala', 'Rice', 'Sabut Moong Dal', 'Green Salad', 'Chapati'] }
  },
  {
    date: '2026-08-17',
    day: 'monday',
    breakfast: { time: '', items: ['Poha', 'Chutney', 'Besan Chilla', 'Tea'] },
    lunch: { time: '', items: ['Chana Dal', 'Mushroom Do Pyaza', 'Rice', 'Boondi Raita', 'Kachumber Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Nibupani', 'Chips'] },
    snacksGirls: { time: '', items: ['Tea', 'Bread Pakoda'] },
    dinner: { time: '', items: ['White Chana', 'Aloo Capsicums', 'Jeera Rice', 'Green Salad', 'Chapati', 'Suji Ka Halwa'] }
  },
  {
    date: '2026-08-18',
    day: 'tuesday',
    breakfast: { time: '', items: ['Aloo Sandwich', 'Corn Flakes', 'Tea', 'Milk'] },
    lunch: { time: '', items: ['Black Chana', 'Gatta Curry', 'Rice', 'Masala Chass', 'Kachumber Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Bread Pakoda'] },
    snacksGirls: { time: '', items: ['Nibupani', 'Chips'] },
    dinner: { time: '', items: ['Rajmah Kadhai Veg', 'Rice', 'Green Salad', 'Chapati'] }
  },
  {
    date: '2026-08-19',
    day: 'wednesday',
    breakfast: { time: '', items: ['Aloo Bhaji', 'Poori', 'Pickle', 'Tea'] },
    lunch: { time: '', items: ['Punchmail Dal', 'Green Peas Masala', 'Jeera Rice', 'Mint Boondi Raita', 'Kachumber Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Namakpare'] },
    snacksGirls: { time: '', items: ['Namkeen', 'Roohafza'] },
    dinner: { time: '', items: ['Butter Chicken', 'Paneer Lababdar', 'Moong Dal', 'Sirka Onion', 'Chapati'] }
  },
  {
    date: '2026-08-20',
    day: 'thursday',
    breakfast: { time: '', items: ['Namkeen Sewaiyan', 'Coleslaw Sandwich', 'Ketchup', 'Milk', 'Tea'] },
    lunch: { time: '', items: ['Kadhi Pakora', 'Aloo Matar', 'Rice', 'Fryums', 'Chapati'] },
    snacksBoys: { time: '', items: ['Namkeen', 'Roohafza'] },
    snacksGirls: { time: '', items: ['Tea', 'Namakpare'] },
    dinner: { time: '', items: ['Dhaba Dal', 'Nutry Masala', 'Jeera Rice', 'Green Salad', 'Chapati', 'Chocolate'] }
  },
  {
    date: '2026-08-21',
    day: 'friday',
    breakfast: { time: '', items: ['Sweet Daliya', 'Boiled Eggs', 'Banana', 'Butter', 'Jam', 'Bread', 'Tea'] },
    lunch: { time: '', items: ['Dal Kolapuri', 'Aloo Capsicums', 'Rice', 'Ghiya Raita', 'Kachumber Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Biscuit'] },
    snacksGirls: { time: '', items: ['Tea', 'Biscuit'] },
    dinner: { time: '', items: ['Dal Makhani', 'Maratha Kofta', 'Rice', 'Green Salad', 'Chapati'] }
  },
  {
    date: '2026-08-22',
    day: 'saturday',
    breakfast: { time: '', items: ['Aloo Paratha', 'Curd', 'Pickle', 'Tea', 'Butter'] },
    lunch: { time: '', items: ['Punchmail', 'Mushroom Masala', 'Jeera Rice', 'Green Salad', 'Boondi Raita', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Tea Cake'] },
    snacksGirls: { time: '', items: ['Tea', 'Mix Pakora'] },
    dinner: { time: '', items: ['Rajma Rasela', 'Katha Mitha Kaddu', 'Rice', 'Chapati', 'Green Salad', 'Besan Ki Barfi'] }
  },
  {
    date: '2026-08-23',
    day: 'sunday',
    breakfast: { time: '', items: ['Chole Bhature', 'Pickle', 'Green Chilli', 'Tea'] },
    lunch: { time: '', items: ['Veg Biryani', 'Tam Aloo', 'Mix Raita', 'Penut Chana Salad', 'Chapati'] },
    snacksBoys: { time: '', items: ['Tea', 'Mix Pakora'] },
    snacksGirls: { time: '', items: ['Tea', 'Tea Cake'] },
    dinner: { time: '', items: ['Paneer Makhani', 'Egg Curry', 'Jeera Rice', 'Lobiya Dal', 'Green Salad', 'Chapati'] }
  }
];

// Returns map indexed ONLY by explicit date (e.g. '2026-08-16')
export function generateMockMenus(): Record<string, DailyMenu> {
  const map: Record<string, DailyMenu> = {};
  SEEDED_MENUS.forEach(m => {
    map[m.date] = m;
  });
  return map;
}
