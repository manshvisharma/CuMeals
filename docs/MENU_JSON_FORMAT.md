# Menu JSON format (with food icons)

Every dish on the dashboard shows a small emoji icon (🍚 Poha, 🍵 Tea, 🫓 Chapati …).
You give the icon in the JSON you upload in **Admin → JSON → Import**.

## The format

```json
[
  {
    "date": "2026-10-20",
    "breakfast":   { "items": [ { "name": "Poha", "icon": "🍚" }, { "name": "Tea", "icon": "🍵" } ] },
    "lunch":       { "items": [ { "name": "Chana Dal", "icon": "🍲" }, { "name": "Rice", "icon": "🍚" } ] },
    "snacksBoys":  { "items": [ { "name": "Tea", "icon": "🍵" }, { "name": "Bread Pakoda", "icon": "🧆" } ] },
    "snacksGirls": { "items": [ { "name": "Tea", "icon": "🍵" }, { "name": "Biscuit", "icon": "🍪" } ] },
    "dinner":      { "items": [ { "name": "Paneer Makhani", "icon": "🧀" }, { "name": "Chapati", "icon": "🫓" } ] }
  }
]
```

* One object per date (a single object also works). `date` = `YYYY-MM-DD`.
* Each dish = `{ "name": "...", "icon": "<ONE emoji>" }`.
* If boys and girls get the same snacks you may write one `"snacks": { "items": [...] }` instead of `snacksBoys` + `snacksGirls`.
* **Old files still work.** A dish can still be plain text (`"Poha"`); it then gets an automatic icon guessed from its name.
* An invalid icon (letters, several emoji…) never blocks the import – you get a note and the automatic icon is used.
* Icons are also used in the notifications students receive ("🍲 Chana Dal, 🍚 Rice · 12:30 PM – 2:00 PM").

## Changing an icon later

* **Admin → Menu** : the small box in front of each dish is its emoji. Type/paste one emoji; leave it empty for the automatic icon.
* **Admin → JSON → Export** gives you the day in this same format (icons included), ready to edit and re-import.

## Let AI write the JSON

In **Admin → JSON → Import** press **Copy AI prompt**, paste it into ChatGPT / Gemini / Claude and attach your menu (text or photo). The prompt is:

```text
You convert a hostel mess menu into JSON for the CuMeals app.

Return ONLY valid JSON (no explanation, no markdown fences): an ARRAY with one object per date.

FORMAT
[
  {
    "date": "2026-10-20",
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
🍵 Tea / Chai
☕ Coffee
🥛 Milk / Lassi / Chaas
🥤 Juice / Roohafza / Cold drink
🍋 Nimbu pani / Lemon
🍚 Poha
🍚 Rice / Jeera Rice / Pulao
🍛 Veg Biryani
🥣 Khichdi / Daliya / Cornflakes / Upma
🍥 Idli
🥞 Dosa / Uttapam / Chilla / Pancake
🫓 Chapati / Roti / Paratha / Puri / Naan / Bhature
🍞 Bread / Toast / Pav
🥪 Sandwich
🍜 Noodles / Maggi / Sewaiyan
🍝 Pasta
🥟 Samosa / Momos
🧆 Pakoda / Kachori / Kofta / Tikki / Cutlet
🍩 Vada / Dahi Vada
🍲 Dal / Rajma / Chole / Chana / Kadhi / Sambar
🍲 Any curry / sabzi / masala (generic)
🧀 Paneer dishes / Cheese
🍗 Chicken
🥚 Egg (boiled)
🍳 Egg curry / Omelette
🐟 Fish
🍖 Mutton / Keema
🥔 Aloo / Potato
🥦 Gobi / Broccoli
🥬 Palak / Cabbage / Methi / Saag
🥒 Bhindi / Lauki / Karela / Cucumber
🎃 Kaddu / Pumpkin
🍆 Baingan
🍅 Tomato
🧅 Onion
🥕 Carrot
🌽 Corn
🫑 Capsicum
🍄 Mushroom
🌱 Peas / Beans / Soya
🥜 Peanut
🥗 Salad / Kachumber
🥣 Raita / Curd / Dahi
🥒 Pickle
🌿 Chutney
🍅 Ketchup / Sauce
🍓 Jam
🧈 Butter / Ghee
🍯 Honey
🍮 Halwa / Kheer / Custard
🍡 Gulab Jamun / Rasgulla / Laddu / Jalebi
🍬 Barfi / other sweets
🍨 Ice cream / Kulfi
🍫 Chocolate
🍰 Cake / Tea Cake / Pastry
🍪 Biscuit / Cookies
🍟 Chips / Fries
🥨 Namkeen / Papad / Fryums / Mixture
🍌 Banana
🍎 Apple / Fruits
🍊 Orange
🥭 Mango
🍉 Watermelon
🍽️ Anything not listed
- If no emoji fits, use 🍽️.
- Do not invent dishes or dates. Keep the order of dishes as in the menu.
```

## Emoji used for automatic icons

| Food | Emoji |
|---|---|
| Tea / Chai | 🍵 |
| Coffee | ☕ |
| Milk / Lassi / Chaas | 🥛 |
| Juice / Roohafza / Cold drink | 🥤 |
| Nimbu pani / Lemon | 🍋 |
| Poha | 🍚 |
| Rice / Jeera Rice / Pulao | 🍚 |
| Veg Biryani | 🍛 |
| Khichdi / Daliya / Cornflakes / Upma | 🥣 |
| Idli | 🍥 |
| Dosa / Uttapam / Chilla / Pancake | 🥞 |
| Chapati / Roti / Paratha / Puri / Naan / Bhature | 🫓 |
| Bread / Toast / Pav | 🍞 |
| Sandwich | 🥪 |
| Noodles / Maggi / Sewaiyan | 🍜 |
| Pasta | 🍝 |
| Samosa / Momos | 🥟 |
| Pakoda / Kachori / Kofta / Tikki / Cutlet | 🧆 |
| Vada / Dahi Vada | 🍩 |
| Dal / Rajma / Chole / Chana / Kadhi / Sambar | 🍲 |
| Any curry / sabzi / masala (generic) | 🍲 |
| Paneer dishes / Cheese | 🧀 |
| Chicken | 🍗 |
| Egg (boiled) | 🥚 |
| Egg curry / Omelette | 🍳 |
| Fish | 🐟 |
| Mutton / Keema | 🍖 |
| Aloo / Potato | 🥔 |
| Gobi / Broccoli | 🥦 |
| Palak / Cabbage / Methi / Saag | 🥬 |
| Bhindi / Lauki / Karela / Cucumber | 🥒 |
| Kaddu / Pumpkin | 🎃 |
| Baingan | 🍆 |
| Tomato | 🍅 |
| Onion | 🧅 |
| Carrot | 🥕 |
| Corn | 🌽 |
| Capsicum | 🫑 |
| Mushroom | 🍄 |
| Peas / Beans / Soya | 🌱 |
| Peanut | 🥜 |
| Salad / Kachumber | 🥗 |
| Raita / Curd / Dahi | 🥣 |
| Pickle | 🥒 |
| Chutney | 🌿 |
| Ketchup / Sauce | 🍅 |
| Jam | 🍓 |
| Butter / Ghee | 🧈 |
| Honey | 🍯 |
| Halwa / Kheer / Custard | 🍮 |
| Gulab Jamun / Rasgulla / Laddu / Jalebi | 🍡 |
| Barfi / other sweets | 🍬 |
| Ice cream / Kulfi | 🍨 |
| Chocolate | 🍫 |
| Cake / Tea Cake / Pastry | 🍰 |
| Biscuit / Cookies | 🍪 |
| Chips / Fries | 🍟 |
| Namkeen / Papad / Fryums / Mixture | 🥨 |
| Banana | 🍌 |
| Apple / Fruits | 🍎 |
| Orange | 🍊 |
| Mango | 🥭 |
| Watermelon | 🍉 |
| Anything not listed | 🍽️ |
