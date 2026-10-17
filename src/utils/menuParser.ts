import { DailyMenu, DayOfWeek, MealData } from '../types';
import { getDayOfWeekFromDate } from './dateUtils';
import { ItemIcon, normalizeIcon } from './foodIcons';

export interface ParseResult {
  isValid: boolean;
  isBulk: boolean;
  menus: DailyMenu[];
  errors: string[];
  /** Non-blocking notes, e.g. "icon for 'Poha' is not an emoji – automatic icon will be used". */
  warnings: string[];
}

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function parseAndValidateMenuJson(jsonString: string): ParseResult {
  const result: ParseResult = {
    isValid: false,
    isBulk: false,
    menus: [],
    errors: [],
    warnings: []
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
        result.menus.push(cleanMenuObject(item, `[Entry #${index + 1}]`, result.warnings));
      }
    });
  } else if (typeof parsed === 'object' && parsed !== null) {
    result.isBulk = false;
    const errs = validateSingleMenuObject(parsed, 1);
    if (errs.length > 0) {
      result.errors.push(...errs);
    } else {
      result.menus.push(cleanMenuObject(parsed, '[Entry #1]', result.warnings));
    }
  } else {
    result.errors.push('JSON must be an object or an array of objects.');
  }

  result.warnings = Array.from(new Set(result.warnings));
  result.isValid = result.errors.length === 0 && result.menus.length > 0;
  return result;
}

const MEAL_KEYS = ['breakfast', 'lunch', 'snacksBoys', 'snacksGirls', 'snacks', 'dinner'];

/** The dish list can be { items: [...] } or directly [...] */
function rawItemList(mealObj: any): any[] {
  if (!mealObj) return [];
  if (Array.isArray(mealObj.items)) return mealObj.items;
  if (Array.isArray(mealObj)) return mealObj;
  return [];
}

/** A dish is either "Poha" or { "name": "Poha", "icon": "🍚" } */
function dishName(raw: any): string {
  if (raw && typeof raw === 'object') {
    return String(raw.name ?? raw.item ?? raw.dish ?? raw.title ?? '').trim();
  }
  return String(raw ?? '').trim();
}

function validateSingleMenuObject(obj: any, index: number): string[] {
  const errs: string[] = [];
  const prefix = `[Entry #${index}]`;

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [`${prefix} must be an object like { "date": "2026-08-20", "breakfast": { "items": [...] } }.`];
  }

  const dateVal = String(obj.date || obj.day || '').trim();
  const hasDay = VALID_DAYS.includes(dateVal.toLowerCase());
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(dateVal);

  if (!hasDay && !hasDate) {
    errs.push(`${prefix} Missing valid 'date' (e.g. "2026-08-20") or 'day' (e.g. "thursday").`);
  }

  MEAL_KEYS.forEach((m) => {
    const meal = obj[m];
    if (meal === undefined || meal === null) return;
    if (typeof meal !== 'object') {
      errs.push(`${prefix} '${m}' must be an object with an 'items' array.`);
      return;
    }
    if (!Array.isArray(meal) && meal.items !== undefined && !Array.isArray(meal.items)) {
      errs.push(`${prefix} '${m}.items' must be an array (e.g. ["Poha", "Tea"]).`);
      return;
    }
    rawItemList(meal).forEach((it, i) => {
      if (it && typeof it === 'object' && !Array.isArray(it)) {
        if (!dishName(it)) errs.push(`${prefix} '${m}.items[${i}]' needs a "name" (e.g. { "name": "Poha", "icon": "🍚" }).`);
      } else if (typeof it !== 'string' && typeof it !== 'number') {
        errs.push(`${prefix} '${m}.items[${i}]' must be a dish name or { "name", "icon" }.`);
      }
    });
  });

  return errs;
}

function extractMeal(mealObj: any, label: string, warnings: string[]): { items: string[]; icons: ItemIcon[] } {
  const items: string[] = [];
  const icons: ItemIcon[] = [];
  const seen = new Set<string>();

  for (const raw of rawItemList(mealObj)) {
    const name = dishName(raw);
    if (!name) continue;
    items.push(name);

    if (raw && typeof raw === 'object') {
      const rawIcon = raw.icon ?? raw.emoji;
      if (rawIcon !== undefined && rawIcon !== null && String(rawIcon).trim() !== '') {
        const clean = normalizeIcon(rawIcon);
        if (clean) {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            icons.push({ name, icon: clean });
          }
        } else {
          warnings.push(`${label} icon "${String(rawIcon)}" for "${name}" is not an emoji — an automatic icon will be used.`);
        }
      }
    }
  }
  return { items, icons };
}

function cleanMenuObject(raw: any, label: string, warnings: string[]): DailyMenu {
  const dateKey = String(raw.date || raw.day || '').trim().toLowerCase();
  const isDatePattern = /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
  const resolvedDay: DayOfWeek = isDatePattern
    ? getDayOfWeekFromDate(dateKey)
    : (VALID_DAYS.includes(dateKey) ? (dateKey as DayOfWeek) : 'monday');

  // Preserve the exact date string if provided (e.g. "2026-08-20")
  const finalDate = isDatePattern ? dateKey : resolvedDay;

  const build = (obj: any, fallbackTime: string, mealLabel: string, quiet = false): MealData => {
    const { items, icons } = extractMeal(obj, `${label} ${mealLabel}:`, quiet ? [] : warnings);
    const meal: MealData = { time: (obj && !Array.isArray(obj) && obj.time) || fallbackTime || '', items };
    if (icons.length > 0) meal.icons = icons;
    return meal;
  };

  const sharedSnacks = raw.snacks;
  return {
    date: finalDate,
    day: resolvedDay,
    breakfast: build(raw.breakfast, '', 'breakfast'),
    lunch: build(raw.lunch, '', 'lunch'),
    snacksBoys: build(raw.snacksBoys || sharedSnacks, sharedSnacks?.time || '', 'snacksBoys'),
    snacksGirls: build(raw.snacksGirls || sharedSnacks, sharedSnacks?.time || '', 'snacksGirls', !raw.snacksGirls && !!sharedSnacks),
    dinner: build(raw.dinner, '', 'dinner'),
    updatedAt: new Date().toISOString()
  };
}
