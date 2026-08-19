import { DailyMenu, DayOfWeek } from '../types';
import { getDayOfWeekFromDate } from './dateUtils';

export interface ParseResult {
  isValid: boolean;
  isBulk: boolean;
  menus: DailyMenu[];
  errors: string[];
}

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

  const dateVal = String(obj.date || obj.day || '').trim();
  const hasDay = VALID_DAYS.includes(dateVal.toLowerCase());
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(dateVal);

  if (!hasDay && !hasDate) {
    errs.push(`${prefix} Missing valid 'date' (e.g. "2026-08-20") or 'day' (e.g. "thursday").`);
  }

  const meals = ['breakfast', 'lunch', 'snacksBoys', 'snacksGirls', 'snacks', 'dinner'];
  meals.forEach(m => {
    if (obj[m] && typeof obj[m] !== 'object') {
      errs.push(`${prefix} '${m}' must be an object with an 'items' array.`);
    }
  });

  return errs;
}

function extractItems(mealObj: any): string[] {
  if (!mealObj) return [];
  if (Array.isArray(mealObj.items)) {
    return mealObj.items.map((i: any) => String(i).trim()).filter((i: string) => i.length > 0);
  }
  if (Array.isArray(mealObj)) {
    return mealObj.map((i: any) => String(i).trim()).filter((i: string) => i.length > 0);
  }
  return [];
}

function cleanMenuObject(raw: any): DailyMenu {
  const dateKey = String(raw.date || raw.day || '').trim().toLowerCase();
  const isDatePattern = /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
  const resolvedDay: DayOfWeek = isDatePattern 
    ? getDayOfWeekFromDate(dateKey) 
    : (VALID_DAYS.includes(dateKey) ? (dateKey as DayOfWeek) : 'monday');

  // Preserve the exact date string if provided (e.g. "2026-08-20")
  const finalDate = isDatePattern ? dateKey : resolvedDay;

  const snacksBoysItems = extractItems(raw.snacksBoys || raw.snacks);
  const snacksGirlsItems = extractItems(raw.snacksGirls || raw.snacks);

  return {
    date: finalDate,
    day: resolvedDay,
    breakfast: {
      time: raw.breakfast?.time || '',
      items: extractItems(raw.breakfast)
    },
    lunch: {
      time: raw.lunch?.time || '',
      items: extractItems(raw.lunch)
    },
    snacksBoys: {
      time: raw.snacksBoys?.time || raw.snacks?.time || '',
      items: snacksBoysItems
    },
    snacksGirls: {
      time: raw.snacksGirls?.time || raw.snacks?.time || '',
      items: snacksGirlsItems
    },
    dinner: {
      time: raw.dinner?.time || '',
      items: extractItems(raw.dinner)
    },
    updatedAt: new Date().toISOString()
  };
}
