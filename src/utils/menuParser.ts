import { DailyMenu } from '../types';

export interface ParseResult {
  isValid: boolean;
  isBulk: boolean;
  menus: DailyMenu[];
  errors: string[];
}

export function parseAndValidateMenuJson(jsonString: string): ParseResult {
  const result: ParseResult = {
    isValid: false,
    isBulk: false,
    menus: [],
    errors: []
  };

  if (!jsonString || !jsonString.trim()) {
    result.errors.push('JSON string cannot be empty.');
    return result;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    result.errors.push(`Invalid JSON format: ${(err as Error).message}`);
    return result;
  }

  if (Array.isArray(parsed)) {
    result.isBulk = true;
    parsed.forEach((item, index) => {
      const errs = validateSingleMenuObject(item, index + 1);
      if (errs.length > 0) {
        result.errors.push(...errs);
      } else {
        result.menus.push(cleanMenuObject(item));
      }
    });
  } else if (typeof parsed === 'object' && parsed !== null) {
    result.isBulk = false;
    const errs = validateSingleMenuObject(parsed, 1);
    if (errs.length > 0) {
      result.errors.push(...errs);
    } else {
      result.menus.push(cleanMenuObject(parsed));
    }
  } else {
    result.errors.push('JSON must be an object or an array of objects.');
  }

  result.isValid = result.errors.length === 0 && result.menus.length > 0;
  return result;
}

function validateSingleMenuObject(obj: any, index: number): string[] {
  const errs: string[] = [];
  const prefix = `[Entry #${index}]`;

  if (!obj.date) {
    errs.push(`${prefix} Missing 'date' property (expected YYYY-MM-DD).`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) {
    errs.push(`${prefix} Invalid date format '${obj.date}'. Must be YYYY-MM-DD.`);
  }

  const meals = ['breakfast', 'lunch', 'snacksBoys', 'snacksGirls', 'dinner'];
  meals.forEach(m => {
    if (obj[m] && typeof obj[m] !== 'object') {
      errs.push(`${prefix} '${m}' must be an object with 'time' and 'items'.`);
    }
  });

  return errs;
}

function cleanMenuObject(raw: any): DailyMenu {
  const defaultMeal = (time: string, items: string[]) => ({
    time: raw?.time || time,
    items: Array.isArray(raw?.items) ? raw.items : items
  });

  return {
    date: raw.date,
    breakfast: {
      time: raw.breakfast?.time || '8:00 AM – 9:30 AM',
      items: Array.isArray(raw.breakfast?.items) ? raw.breakfast.items : ['Poha', 'Banana', 'Tea']
    },
    lunch: {
      time: raw.lunch?.time || '12:30 PM – 2:00 PM',
      items: Array.isArray(raw.lunch?.items) ? raw.lunch.items : ['Rajma Chawal', 'Salad']
    },
    snacksBoys: {
      time: raw.snacksBoys?.time || raw.snacks?.time || '4:30 PM – 5:30 PM',
      items: Array.isArray(raw.snacksBoys?.items) ? raw.snacksBoys.items : Array.isArray(raw.snacks?.items) ? raw.snacks.items : ['Samosa', 'Tea']
    },
    snacksGirls: {
      time: raw.snacksGirls?.time || raw.snacks?.time || '4:30 PM – 5:30 PM',
      items: Array.isArray(raw.snacksGirls?.items) ? raw.snacksGirls.items : Array.isArray(raw.snacks?.items) ? raw.snacks.items : ['Sandwich', 'Milk']
    },
    dinner: {
      time: raw.dinner?.time || '8:00 PM – 9:30 PM',
      items: Array.isArray(raw.dinner?.items) ? raw.dinner.items : ['Dal', 'Rice', 'Mix Veg']
    },
    updatedAt: new Date().toISOString()
  };
}
