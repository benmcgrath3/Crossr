export const puzzles = [
  {
    id: 'opposite-activities', title: 'Opposite activities', size: 11, kind: 'Midi', author: 'Phil Fraas', difficulty: 'Medium',
    description: 'The 11 × 11 puzzle from your reference.',
    source: 'Transcribed from the reference screenshot supplied by the user. Missing lower clues reconstructed from the filled answers.',
    rows: ['ATARI#DEFAT', 'SOLON#ARISE', 'PUBLICWORKS', 'ISEE#ODDEST', 'CLI#VOLE###', 'SETAE#EDITS', '###GNUS#CHA', 'USURER#FEES', 'SCREENPLAYS', 'EAGER#EAGLE', 'DRESS#AXELS'],
    across: ['Electronic game pioneer', 'Trim, as meat', 'Athenian statesman', 'Come up', 'Government infrastructure projects', 'Words of comprehension', 'Most strange', '151, in old Rome', 'Mouselike animal', 'Bristles (from the Latin)', 'Blue-pencils', 'Wildebeests', 'When repeated, a Latin dance', 'Loan shark', 'Lawyers’ charges', 'Movie scripts', 'Keen', 'Bald bird of prey', 'Put on clothes', 'Figure-skating jumps'],
    down: ['Savory jellies', 'Dishevel, as hair', 'Even though', 'Part in a movie', 'Mart or pan finisher', 'Dilly-dallies', 'Washed or worn away', 'Can', 'Is inquisitive', 'Audition, e.g.', 'Bill and ____', 'Decorative coverings of fine wood', 'Goes along', 'Geologic cooling-off period', 'Common pronoun + verb contraction', 'Is lippy', 'Vase for ashes', 'Secondhand', 'Mark left by a wound', 'Strong desire', 'Linen source', 'Pod occupant'],
  },
  {
    id: 'heart-of-the-matter', title: 'Heart of the matter', size: 5, difficulty: 'A little challenge',
    description: 'Five letters, a little more to ponder.',
    rows: ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'],
    across: ['It may skip a beat', 'A glow left in the fireplace', 'Misuse, as a privilege', 'Sticky substance from a pine tree', 'Something that’s catching on'],
    down: ['The center of something', 'One last spark in the ashes', 'Treat cruelly', 'Amber begins as this', 'General direction of change'],
  },
  {
    id: 'a-good-turn', title: 'A good turn', size: 4, difficulty: 'Easy does it',
    description: 'A quick sixteen-square escape.',
    rows: ['BALL', 'AREA', 'LEAD', 'LADY'],
    across: ['A sphere used in many sports', 'Length times width', 'Go first, or show the way', 'A woman, politely'],
    down: ['A grand dance', 'A region or section', 'Pencil “___” (actually graphite)', 'Title paired with “Lord”'],
  },
  {
    id: 'small-wonders', title: 'Small wonders', size: 3, difficulty: 'Just a warm-up',
    description: 'Nine squares to find your rhythm.',
    rows: ['CAT', 'ARE', 'TEN'],
    across: ['A pet with a purr', '“We ___ the champions”', 'Number of fingers on two hands'],
    down: ['A feline friend', '“You ___ here”', 'A perfect score, often'],
  },
];

export function createEntries(puzzle) {
  const entries = { across: [], down: [] };
  let number = 0;
  for (let index = 0; index < puzzle.size ** 2; index++) {
    const row = Math.floor(index / puzzle.size), col = index % puzzle.size;
    if (puzzle.rows[row][col] === '#') continue;
    const acrossStart = col === 0 || puzzle.rows[row][col - 1] === '#';
    const downStart = row === 0 || puzzle.rows[row - 1][col] === '#';
    if (!acrossStart && !downStart) continue;
    number++;
    for (const direction of ['across', 'down']) {
      if (!(direction === 'across' ? acrossStart : downStart)) continue;
      const cells = [];
      let r = row, c = col;
      while (r < puzzle.size && c < puzzle.size && puzzle.rows[r][c] !== '#') {
        cells.push(r * puzzle.size + c);
        if (direction === 'across') c++; else r++;
      }
      entries[direction].push({ number, direction, cells, clue: puzzle[direction][entries[direction].length], answer: cells.map(i => puzzle.rows[Math.floor(i / puzzle.size)][i % puzzle.size]).join('') });
    }
  }
  return entries;
}

export function answerAt(puzzle, index) { return puzzle.rows[Math.floor(index / puzzle.size)][index % puzzle.size]; }
export function entryAt(entries, direction, index) { return entries[direction].find(entry => entry.cells.includes(index)); }
export function isSolved(puzzle, letters) { return puzzle.rows.join('').split('').every((letter, i) => letter === '#' || letters[i] === letter); }
export function formatTime(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

export function restoreProgress(puzzle, saved) {
  const count = puzzle.size ** 2;
  const firstCell = puzzle.rows.join('').split('').findIndex(letter => letter !== '#');
  const fresh = { letters: Array(count).fill(''), pencil: Array(count).fill(false), revealed: Array(count).fill(false), seconds: 0, selected: firstCell, direction: 'across' };
  if (!saved || !Array.isArray(saved.letters) || saved.letters.length !== count) return fresh;
  return {
    letters: Array.from({length: count}, (_, i) => answerAt(puzzle, i) !== '#' && typeof saved.letters[i] === 'string' && /^[A-Z]$/.test(saved.letters[i]) ? saved.letters[i] : ''),
    pencil: Array.from({length: count}, (_, i) => answerAt(puzzle, i) !== '#' && saved.pencil?.[i] === true),
    revealed: Array.from({length: count}, (_, i) => answerAt(puzzle, i) !== '#' && saved.revealed?.[i] === true),
    seconds: Number.isFinite(saved.seconds) ? Math.max(0, Math.floor(saved.seconds)) : 0,
    selected: Number.isInteger(saved.selected) && saved.selected >= 0 && saved.selected < count && answerAt(puzzle, saved.selected) !== '#' ? saved.selected : firstCell,
    direction: saved.direction === 'down' ? 'down' : 'across',
  };
}
