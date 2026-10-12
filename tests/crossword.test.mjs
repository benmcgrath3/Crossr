import test from 'node:test';
import assert from 'node:assert/strict';
import { puzzles, createEntries, answerAt, entryAt, isSolved, formatTime, restoreProgress } from '../src/crossword.js';

for (const puzzle of puzzles) {
  test(`${puzzle.title}: all clues match valid crossing entries`, () => {
    assert.equal(puzzle.rows.length, puzzle.size);
    assert.ok(puzzle.rows.every(row => row.length === puzzle.size && /^[A-Z#]+$/.test(row)));
    const entries = createEntries(puzzle);
    for (const direction of ['across', 'down']) {
      assert.equal(entries[direction].length, puzzle[direction].length);
      for (const entry of entries[direction]) {
        assert.ok(entry.clue);
        assert.equal(entry.answer.length, entry.cells.length);
        for (const index of entry.cells) assert.equal(entryAt(entries, direction, index), entry);
      }
    }
    const letters = puzzle.rows.join('').split('');
    assert.ok(isSolved(puzzle, letters));
    letters[0] = letters[0] === 'Z' ? 'A' : 'Z';
    assert.equal(isSolved(puzzle, letters), false);
    letters[0] = '';
    assert.equal(isSolved(puzzle, letters), false);
  });
}
test('conventional numbering is shared at intersections', () => {
  const entries = createEntries(puzzles.find(p => p.id === 'heart-of-the-matter'));
  assert.deepEqual(entries.across.map(e => e.number), [1, 6, 7, 8, 9]);
  assert.deepEqual(entries.down.map(e => e.number), [1, 2, 3, 4, 5]);
  assert.equal(entries.down[3].answer, 'RESIN');
});
test('black squares split entries and are excluded from completion', () => {
  const puzzle = {size:3,rows:['AB#','C#D','EFG'],across:['one','two','three','four'],down:['one','two','three','four']};
  const entries = createEntries(puzzle);
  assert.deepEqual(entries.across.map(e => e.cells), [[0,1],[3],[5],[6,7,8]]);
  assert.deepEqual(entries.down.map(e => e.cells), [[0,3,6],[1],[5,8],[7]]);
  const letters = ['A','B','','C','','D','E','F','G'];
  assert.ok(isSolved(puzzle, letters));
  assert.equal(answerAt(puzzle, 4), '#');
});
test('saved progress validates corrupt data while preserving useful state', () => {
  const puzzle = puzzles.find(p => p.id === 'small-wonders');
  assert.equal(restoreProgress(puzzle, null).letters.length, 9);
  assert.deepEqual(restoreProgress(puzzle, {letters:['A']}).letters, Array(9).fill(''));
  const saved = {letters:['C','<script>',3,'A','','','T','',''],pencil:[true],seconds:-1,selected:300,direction:'diagonal'};
  const restored = restoreProgress(puzzle,saved);
  assert.deepEqual(restored.letters, ['C','','','A','','','T','','']);
  assert.equal(restored.seconds,0); assert.equal(restored.selected,0); assert.equal(restored.direction,'across');
  assert.equal(restored.pencil[0],true);
  const roundTrip = restoreProgress(puzzle,{...restored,seconds:93,selected:4,direction:'down'});
  assert.equal(roundTrip.seconds,93); assert.equal(roundTrip.selected,4); assert.equal(roundTrip.direction,'down');
});
test('timer formats minutes without truncating long solves', () => {
  assert.equal(formatTime(0),'0:00'); assert.equal(formatTime(65),'1:05'); assert.equal(formatTime(3600),'60:00');
});
test('midi reference has exact clue numbering and checked crossings', () => {
  const puzzle = puzzles[0], entries = createEntries(puzzle);
  assert.equal(puzzle.size,11);
  assert.equal(puzzle.rows.join('').split('').filter(c => c === '#').length,15);
  assert.deepEqual(entries.across.map(e => e.number), [1,6,11,12,13,15,16,17,18,19,21,25,27,28,31,32,34,35,36,37]);
  assert.deepEqual(entries.down.map(e => e.number), [1,2,3,4,5,6,7,8,9,10,14,18,20,22,23,24,26,28,29,30,31,33]);
  assert.equal(entries.across.find(e => e.number === 13).answer, 'PUBLICWORKS');
  assert.equal(entries.across.find(e => e.number === 32).answer, 'SCREENPLAYS');
  assert.equal(entries.down.find(e => e.number === 18).answer, 'VENEERS');
  assert.equal(entries.down.find(e => e.number === 22).answer, 'ICEAGE');
});
test('midi saved progress cannot put letters or selection in black squares', () => {
  const puzzle = puzzles[0];
  const state = restoreProgress(puzzle, {letters:Array(121).fill('X'),pencil:Array(121).fill(true),revealed:Array(121).fill(true),selected:5});
  assert.equal(state.selected,0);
  assert.equal(state.letters.filter(Boolean).length,106);
  assert.equal(state.letters[5],''); assert.equal(state.pencil[5],false); assert.equal(state.revealed[5],false);
  const solved = puzzle.rows.join('').split('').map(letter => letter === '#' ? '' : letter);
  assert.ok(isSolved(puzzle,solved));
});
