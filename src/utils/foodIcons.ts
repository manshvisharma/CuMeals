/**
 * Food icons (emoji) for menu items.
 *
 * - Every menu item can carry its own icon, set in the menu JSON:
 *     "items": [ { "name": "Poha", "icon": "🍚" }, "Tea" ]
 * - If an item has no icon, `guessFoodIcon()` picks one from the dish name.
 * - This file is pure TypeScript (no DOM / React), so the Node server can
 *   import it as well (used for the emoji in notification text).
 */

export const FALLBACK_FOOD_ICON = '🍽️';

/** Stored on a meal as `icons: [{ name, icon }]` (name matched case-insensitively). */
export interface ItemIcon {
  name: string;
  icon: string;
}

/**
 * Ordered rules: the FIRST rule whose keyword matches wins, so put specific
 * dishes ("butter chicken", "tea cake") before generic words ("butter", "tea").
 * Keywords match whole words (plural "s"/"es" allowed). A trailing "*" makes it
 * a prefix match ("pakod*" -> pakoda, pakode, pakodi).
 * Only widely supported emoji are used so they render on older phones too.
 */
const RULES: Array<[string[], string]> = [
  // ---- 1. things that must win over their ingredients ----
  [['salad', 'kachumber', 'green salad', 'sprout salad', 'fruit salad'], '🥗'],
  [['raita', 'boondi raita', 'mix raita', 'curd', 'dahi', 'yogurt', 'yoghurt'], '🥣'],
  [['lassi', 'chaas', 'chhach', 'buttermilk', 'masala chaas', 'badam milk', 'haldi milk', 'milk', 'doodh'], '🥛'],
  [['kadhi pakora', 'kadhi pakoda', 'kadhi pakode', 'kadhi', 'kadi'], '🍲'],
  [['halwa', 'suji ka halwa', 'gajar halwa', 'kheer', 'seviyan kheer', 'payasam', 'phirni', 'custard', 'pudding', 'rabri'], '🍮'],
  [['gulab jamun', 'jamun', 'rasgulla', 'rasmalai', 'rasogolla', 'laddu', 'ladoo', 'peda', 'sandesh', 'jalebi', 'imarti'], '🍡'],
  [['barfi', 'burfi'], '🍬'],
  [['ice cream', 'icecream', 'kulfi'], '🍨'],
  [['tea cake', 'cake', 'pastry', 'muffin', 'cupcake', 'cup cake'], '🍰'],

  // ---- 2. non-veg ----
  [['butter chicken', 'chicken', 'murgh', 'tandoori', 'chilli chicken', 'chicken curry'], '🍗'],
  [['egg curry', 'egg masala', 'egg bhurji', 'omelette', 'omlette', 'omelet'], '🍳'],
  [['boiled egg', 'egg', 'anda'], '🥚'],
  [['fish', 'machli', 'machhi'], '🐟'],
  [['prawn', 'shrimp'], '🍤'],
  [['mutton', 'keema', 'lamb', 'meat'], '🍖'],

  // ---- 3. snacks / breakfast / breads ----
  [['pav bhaji'], '🍛'],
  [['vada pav', 'burger'], '🍔'],
  [['pizza'], '🍕'],
  [['sandwich', 'toastie'], '🥪'],
  [['maggi', 'noodle', 'chowmein', 'chow mein', 'hakka', 'sewaiyan', 'seviyan', 'sevai', 'vermicelli'], '🍜'],
  [['pasta', 'macaroni', 'spaghetti'], '🍝'],
  [['momo', 'samosa', 'dumpling', 'gujiya'], '🥟'],
  [['biryani', 'veg biryani', 'dum biryani'], '🍛'],
  [['khichdi', 'khichri', 'dalia', 'daliya', 'porridge', 'oats', 'cornflakes', 'corn flakes', 'cereal', 'muesli', 'upma'], '🥣'],
  [['poha'], '🍚'],
  [['pulao', 'pulav', 'jeera rice', 'fried rice', 'lemon rice', 'curd rice', 'rice', 'chawal', 'bhat'], '🍚'],
  [['idli'], '🍥'],
  [['dosa', 'masala dosa', 'uttapam', 'uthappam', 'chilla', 'cheela', 'pancake'], '🥞'],
  [['medu vada', 'vada', 'wada', 'dahi vada', 'dahi bhalla'], '🍩'],
  [['kachori', 'kofta', 'tikki', 'cutlet', 'pakod*', 'pakor*', 'bhajiya', 'bhajia', 'fritter', 'pattice', 'patties', 'bonda'], '🧆'],
  [['chapati', 'chapatti', 'roti', 'phulka', 'naan', 'nan', 'paratha', 'parantha', 'kulcha', 'puri', 'poori', 'bhatura', 'bhature', 'thepla', 'roomali'], '🫓'],
  [['pav', 'bun', 'bread', 'toast', 'bread butter'], '🍞'],
  [['papad', 'papadum', 'fryum', 'namkeen', 'mixture', 'sev', 'bhujia', 'namakpare', 'namak pare', 'nimki', 'mathri', 'murukku', 'chakli'], '🥨'],
  [['chips', 'wafer', 'crisps', 'french fries', 'fries', 'finger chips'], '🍟'],
  [['popcorn'], '🍿'],

  // ---- 4. paneer / dal / vegetables ----
  [['paneer', 'shahi paneer', 'palak paneer', 'matar paneer', 'kadai paneer', 'paneer butter masala', 'cottage cheese', 'cheese'], '🧀'],
  [['dal makhani', 'dal', 'daal', 'dhal', 'sambar', 'sambhar', 'rasam', 'tadka', 'panchmel', 'panchmail', 'punchmail', 'panchratna'], '🍲'],
  [['rajma', 'rajmah', 'chole', 'chhole', 'chana', 'channa', 'lobiya', 'lobia', 'moong', 'masoor', 'urad', 'kadhai', 'kadai'], '🍲'],
  [['aloo', 'alu', 'potato', 'jeera aloo', 'dum aloo', 'tam aloo'], '🥔'],
  [['gobi', 'gobhi', 'cauliflower', 'broccoli'], '🥦'],
  [['cabbage', 'patta gobhi', 'palak', 'spinach', 'saag', 'sarson', 'methi', 'fenugreek'], '🥬'],
  [['bhindi', 'okra', 'lauki', 'ghiya', 'doodhi', 'tinda', 'tori', 'turai', 'karela', 'parwal', 'gourd', 'cucumber', 'kheera', 'kakdi'], '🥒'],
  [['kaddu', 'pumpkin', 'katha mitha'], '🎃'],
  [['baingan', 'brinjal', 'eggplant', 'bharta'], '🍆'],
  [['tomato', 'tamatar'], '🍅'],
  [['onion', 'pyaz', 'pyaaz', 'sirka onion'], '🧅'],
  [['carrot', 'gajar'], '🥕'],
  [['corn', 'makka', 'bhutta', 'sweet corn'], '🌽'],
  [['capsicum', 'shimla', 'bell pepper'], '🫑'],
  [['chilli', 'chili', 'mirch', 'green chilli', 'green chili'], '🌶️'],
  [['mushroom'], '🍄'],
  [['peas', 'matar', 'green peas', 'beans', 'french beans', 'sprouts'], '🌱'],
  [['peanut', 'groundnut', 'moongfali', 'mungfali'], '🥜'],
  [['soya', 'soy', 'soyabean', 'nutri', 'nutrela', 'chaap'], '🌱'],

  // ---- 5. condiments ----
  [['pickle', 'achar', 'achaar'], '🥒'],
  [['chutney', 'dip'], '🌿'],
  [['ketchup', 'sauce', 'tomato sauce'], '🍅'],
  [['jam', 'jelly', 'fruit jam'], '🍓'],
  [['butter', 'ghee', 'makhan'], '🧈'],
  [['honey', 'shahad'], '🍯'],

  // ---- 6. sweets / bakery ----
  [['chocolate', 'choco', 'brownie'], '🍫'],
  [['biscuit', 'cookie', 'rusk', 'khari', 'marie'], '🍪'],

  // ---- 7. fruit ----
  [['banana', 'kela'], '🍌'],
  [['apple', 'seb'], '🍎'],
  [['orange', 'santra', 'kinnow', 'mosambi'], '🍊'],
  [['mango', 'aam'], '🥭'],
  [['watermelon', 'tarbooz', 'melon', 'kharbooja'], '🍉'],
  [['grape', 'angoor'], '🍇'],
  [['papaya', 'fruit', 'seasonal fruit'], '🍎'],

  // ---- 8. drinks ----
  [['coffee', 'cold coffee', 'filter coffee'], '☕'],
  [['tea', 'chai', 'green tea', 'masala tea', 'adrak chai'], '🍵'],
  [['nibupani', 'nimbu pani', 'nimbupani', 'lemonade', 'lemon', 'nimbu', 'shikanji'], '🍋'],
  [['roohafza', 'rooh afza', 'sharbat', 'juice', 'shake', 'milkshake', 'cold drink', 'soft drink', 'coke', 'pepsi', 'sprite', 'thums up', 'soda', 'squash', 'jaljeera'], '🥤'],
  [['water', 'packaged water'], '💧'],

  // ---- 9. generic words LAST (so specific dishes above always win) ----
  [['masala', 'curry', 'gravy', 'sabzi', 'sabji', 'bhaji', 'mix veg', 'veg', 'vegetable', 'jhol', 'rasila', 'rasela', 'lababdar', 'makhani', 'korma', 'do pyaza', 'dopyaza', 'kolhapuri', 'kolapuri', 'gatta', 'gatte'], '🍲'],
  [['sweet', 'mithai', 'mishti', 'dessert', 'candy', 'toffee'], '🍬'],
  [['fryums', 'chakna'], '🥨']
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface CompiledRule { re: RegExp; icon: string }

const COMPILED: CompiledRule[] = RULES.flatMap(([keywords, icon]) =>
  keywords.map((kw) => {
    const prefix = kw.endsWith('*');
    const base = escapeRegExp(prefix ? kw.slice(0, -1) : kw).replace(/\s+/g, '\\s+');
    // whole-word match; allow simple plural endings; prefix rules allow any word tail
    const re = prefix
      ? new RegExp(`(^|[^a-z])${base}[a-z]*`, 'i')
      : new RegExp(`(^|[^a-z])${base}(s|es)?($|[^a-z])`, 'i');
    return { re, icon };
  })
);

/** Pick an emoji from the dish name alone. Never throws, always returns something. */
export function guessFoodIcon(name: string): string {
  const text = String(name || '').toLowerCase().trim();
  if (!text) return FALLBACK_FOOD_ICON;
  for (const rule of COMPILED) {
    if (rule.re.test(text)) return rule.icon;
  }
  return FALLBACK_FOOD_ICON;
}

/**
 * Accepts whatever an AI / admin typed for "icon" and returns a clean emoji,
 * or null if it is not a usable emoji (e.g. plain text such as "rice").
 */
export function normalizeIcon(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > 16) return null;
  // must contain a pictograph and no plain letters/digits
  if (!/\p{Extended_Pictographic}/u.test(s)) return null;
  if (/[A-Za-z0-9]/.test(s)) return null;
  // keep only the first emoji "character" (so "🍚🍚" or "🍚 rice" cannot sneak in)
  try {
    const Seg = (Intl as any).Segmenter;
    if (Seg) {
      const first = [...new Seg(undefined, { granularity: 'grapheme' }).segment(s)][0];
      if (first && first.segment) return first.segment as string;
    }
  } catch {
    /* fall through */
  }
  return s;
}

/** Look up the icon for one dish: explicit icon (from JSON) first, then guess. */
export function resolveFoodIcon(name: string, icons?: ItemIcon[] | null): string {
  const key = String(name || '').trim().toLowerCase();
  if (key && Array.isArray(icons)) {
    for (const entry of icons) {
      if (entry && typeof entry.name === 'string' && entry.name.trim().toLowerCase() === key) {
        const clean = normalizeIcon(entry.icon);
        if (clean) return clean;
      }
    }
  }
  return guessFoodIcon(name);
}

/** Pairs for every item of a meal, ready to export / display. */
export function iconsForItems(items: string[], icons?: ItemIcon[] | null): ItemIcon[] {
  return (items || []).map((name) => ({ name, icon: resolveFoodIcon(name, icons) }));
}

/** "🍚 Poha, 🥞 Besan Chilla" – used in push notification text. */
export function formatItemsWithIcons(items: string[], icons: ItemIcon[] | null | undefined, max = 4): string {
  const list = (items || []).filter(Boolean);
  const shown = list.slice(0, max).map((n) => `${resolveFoodIcon(n, icons)} ${n}`);
  const extra = list.length - shown.length;
  return shown.join(', ') + (extra > 0 ? ` +${extra} more` : '');
}

/** Short reference table, embedded in the "AI prompt" so AI uses the same emoji. */
export const ICON_CHEAT_SHEET: Array<[string, string]> = [
  ['Tea / Chai', '🍵'], ['Coffee', '☕'], ['Milk / Lassi / Chaas', '🥛'], ['Juice / Roohafza / Cold drink', '🥤'], ['Nimbu pani / Lemon', '🍋'],
  ['Poha', '🍚'], ['Rice / Jeera Rice / Pulao', '🍚'], ['Veg Biryani', '🍛'], ['Khichdi / Daliya / Cornflakes / Upma', '🥣'], ['Idli', '🍥'],
  ['Dosa / Uttapam / Chilla / Pancake', '🥞'], ['Chapati / Roti / Paratha / Puri / Naan / Bhature', '🫓'], ['Bread / Toast / Pav', '🍞'], ['Sandwich', '🥪'],
  ['Noodles / Maggi / Sewaiyan', '🍜'], ['Pasta', '🍝'], ['Samosa / Momos', '🥟'], ['Pakoda / Kachori / Kofta / Tikki / Cutlet', '🧆'], ['Vada / Dahi Vada', '🍩'],
  ['Dal / Rajma / Chole / Chana / Kadhi / Sambar', '🍲'], ['Any curry / sabzi / masala (generic)', '🍲'], ['Paneer dishes / Cheese', '🧀'],
  ['Chicken', '🍗'], ['Egg (boiled)', '🥚'], ['Egg curry / Omelette', '🍳'], ['Fish', '🐟'], ['Mutton / Keema', '🍖'],
  ['Aloo / Potato', '🥔'], ['Gobi / Broccoli', '🥦'], ['Palak / Cabbage / Methi / Saag', '🥬'], ['Bhindi / Lauki / Karela / Cucumber', '🥒'], ['Kaddu / Pumpkin', '🎃'],
  ['Baingan', '🍆'], ['Tomato', '🍅'], ['Onion', '🧅'], ['Carrot', '🥕'], ['Corn', '🌽'], ['Capsicum', '🫑'], ['Mushroom', '🍄'], ['Peas / Beans / Soya', '🌱'], ['Peanut', '🥜'],
  ['Salad / Kachumber', '🥗'], ['Raita / Curd / Dahi', '🥣'], ['Pickle', '🥒'], ['Chutney', '🌿'], ['Ketchup / Sauce', '🍅'], ['Jam', '🍓'], ['Butter / Ghee', '🧈'], ['Honey', '🍯'],
  ['Halwa / Kheer / Custard', '🍮'], ['Gulab Jamun / Rasgulla / Laddu / Jalebi', '🍡'], ['Barfi / other sweets', '🍬'], ['Ice cream / Kulfi', '🍨'], ['Chocolate', '🍫'], ['Cake / Tea Cake / Pastry', '🍰'], ['Biscuit / Cookies', '🍪'],
  ['Chips / Fries', '🍟'], ['Namkeen / Papad / Fryums / Mixture', '🥨'], ['Banana', '🍌'], ['Apple / Fruits', '🍎'], ['Orange', '🍊'], ['Mango', '🥭'], ['Watermelon', '🍉'],
  ['Anything not listed', FALLBACK_FOOD_ICON]
];
