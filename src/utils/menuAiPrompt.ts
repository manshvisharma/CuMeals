import { ICON_CHEAT_SHEET } from './foodIcons';

/** Text the admin can paste into ChatGPT / Gemini / Claude together with a photo or text of the weekly menu. */
export function buildAiPrompt(sampleDate: string): string {
  const cheat = ICON_CHEAT_SHEET.map(([food, icon]) => `${icon} ${food}`).join('\n');
  return `You convert a hostel mess menu into JSON for the CuMeals app.

Return ONLY valid JSON (no explanation, no markdown fences): an ARRAY with one object per date.

FORMAT
[
  {
    "date": "${sampleDate}",
    "breakfast":   { "items": [ { "name": "Poha", "icon": "🍚" }, { "name": "Tea", "icon": "🍵" } ] },
    "lunch":       { "items": [ { "name": "Chana Dal", "icon": "🍲" }, { "name": "Rice", "icon": "🍚" } ] },
    "snacksBoys":  { "items": [ { "name": "Tea", "icon": "🍵" }, { "name": "Bread Pakoda", "icon": "🧆" } ] },
    "snacksGirls": { "items": [ { "name": "Tea", "icon": "🍵" }, { "name": "Biscuit", "icon": "🍪" } ] },
    "dinner":      { "items": [ { "name": "Paneer Makhani", "icon": "🧀" }, { "name": "Chapati", "icon": "🫓" } ] }
  }
]

RULES
- "date" must be YYYY-MM-DD. Meals are: breakfast, lunch, snacksBoys, snacksGirls, dinner.
- If boys and girls get the same snacks, you may write one "snacks" object instead of snacksBoys + snacksGirls.
- EVERY dish is an object with "name" (as written on the menu, Title Case) and "icon".
- "icon" = exactly ONE emoji that best matches that dish (a single emoji character, no text, no letters).
- Prefer widely supported emoji (Unicode 12 or older) so they show on every phone.
- Use the same emoji for the same food everywhere. Suggested emoji:
${cheat}
- If no emoji fits, use 🍽️.
- Do not invent dishes or dates. Keep the order of dishes as in the menu.`;
}
