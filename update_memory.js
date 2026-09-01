const fs = require('fs');

let content = fs.readFileSync('src/components/games/MemoryGame.tsx', 'utf8');

// Change grid columns and rows
content = content.replace('const COLS = 5;', 'const COLS = 6;');
content = content.replace('const ROWS = 4;', 'const ROWS = 6;');

// Change best score keys
content = content.replace(/memory_best_v2_moves/g, 'memory_best_v3_moves');
content = content.replace(/memory_best_v2_time/g, 'memory_best_v3_time');

// Change saveGameScore game name
content = content.replace(/game: 'memory_v2'/g, "game: 'memory_v3'");

// Change UI text
content = content.replace('5×4 Board', '6×6 Board');

// Change tailwind classes
content = content.replace('grid-cols-5', 'grid-cols-6');
// Update card aspect ratio classes slightly so 6x6 fits better on mobile without scrolling too much
content = content.replace(/aspect-\[4\/5\]/g, 'aspect-square');
content = content.replace(/rounded-\[10px\]/g, 'rounded-md');

fs.writeFileSync('src/components/games/MemoryGame.tsx', content);
