import { puzzles, createEntries, answerAt, entryAt, isSolved, formatTime, restoreProgress } from './crossword.js';

const $ = selector => document.querySelector(selector);
let puzzle, entries, state, cellNodes = [], clueNodes = [], wrong = new Set();
let paused = false, pencilMode = false, completed = false, toastTimeout, confirmAction;
let storageAvailable = true;
let userInteracted = false;
const keyFor = id => `crossr:v1:${id}`;
const savedPreferences = readSaved('crossr:preferences');
const preferences = {
  timer: savedPreferences?.timer !== false,
  highlight: savedPreferences?.highlight !== false,
  skip: savedPreferences?.skip === true,
  large: savedPreferences?.large === true,
};

function readSaved(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function persist() {
  try { localStorage.setItem(keyFor(puzzle.id), JSON.stringify(state)); localStorage.setItem('crossr:last-puzzle', JSON.stringify(puzzle.id)); }
  catch { storageAvailable = false; }
  $('#save-status').textContent = storageAvailable ? 'Progress saved on this device' : 'Progress stays open in this tab';
}
function toast(message) {
  clearTimeout(toastTimeout); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4000);
}
function activeEntry() { return entryAt(entries, state.direction, state.selected); }
function select(index, direction = state.direction, focus = true) {
  if (answerAt(puzzle, index) === '#') return;
  userInteracted = true;
  state.selected = index; state.direction = direction;
  render(); persist();
  keepClueVisible();
  if (focus && !paused) cellNodes[index].focus({ preventScroll: true });
}
function loadPuzzle(id) {
  puzzle = puzzles.find(p => p.id === id) || puzzles[0];
  entries = createEntries(puzzle); state = restoreProgress(puzzle, readSaved(keyFor(puzzle.id)));
  wrong.clear(); paused = false; userInteracted = false; completed = isSolved(puzzle, state.letters);
  const kind = puzzle.kind || 'Mini';
  $('#page-title').textContent = `${kind} Crossword`;
  document.title = `${kind} Crossword — Crossr`;
  $('#puzzle-title').textContent = puzzle.title;
  $('#puzzle-byline').textContent = puzzle.author ? `by ${puzzle.author}` : 'by Crossr';
  $('#puzzle-info').textContent = `${puzzle.title} · ${puzzle.size} × ${puzzle.size} · ${puzzle.difficulty}`;
  $('#puzzle-source').textContent = puzzle.source || 'An original Crossr sample puzzle.';
  $('#grid').style.setProperty('--size', puzzle.size); $('#grid').replaceChildren();
  cellNodes = Array.from({length: puzzle.size ** 2}, (_, index) => {
    const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'cell'; cell.dataset.index = index;
    if (answerAt(puzzle, index) === '#') { cell.classList.add('black'); cell.disabled = true; cell.setAttribute('aria-label', 'Black square'); }
    else {
      const start = [...entries.across, ...entries.down].find(e => e.cells[0] === index);
      if (start) { const number = document.createElement('span'); number.className = 'cell-number'; number.textContent = start.number; number.setAttribute('aria-hidden', 'true'); cell.append(number); }
      const letter = document.createElement('span'); letter.className = 'letter'; letter.setAttribute('aria-hidden', 'true'); cell.append(letter);
      cell.addEventListener('click', () => { if (!paused) select(index, index === state.selected ? opposite(state.direction) : state.direction); });
      cell.addEventListener('keydown', onKey);
    }
    $('#grid').append(cell); return cell;
  });
  clueNodes = [];
  for (const direction of ['across', 'down']) {
    const list = $(`#${direction}-clues`); list.replaceChildren();
    for (const entry of entries[direction]) {
      const item = document.createElement('li'), button = document.createElement('button'); button.className = 'clue-button';
      const number = document.createElement('span'); number.className = 'clue-number'; number.textContent = entry.number;
      const copy = document.createElement('span'); copy.className = 'clue-copy'; copy.textContent = entry.clue;
      button.append(number, copy); button.addEventListener('click', () => { if (paused) setPaused(false); select(entry.cells.find(i => !state.letters[i]) ?? entry.cells[0], direction); });
      item.append(button); list.append(item); clueNodes.push({button, entry});
    }
  }
  render(); persist();
}
function opposite(direction) { return direction === 'across' ? 'down' : 'across'; }
function keepClueVisible() {
  const node = clueNodes.find(({entry}) => entry === activeEntry())?.button;
  if (!node) return;
  const list = node.closest('ol');
  if (list.scrollHeight <= list.clientHeight) return;
  const box = node.getBoundingClientRect(), visible = list.getBoundingClientRect();
  if (box.top < visible.top) list.scrollTop += box.top - visible.top;
  else if (box.bottom > visible.bottom) list.scrollTop += box.bottom - visible.bottom;
}
function render() {
  const active = activeEntry();
  cellNodes.forEach((cell, index) => {
    if (answerAt(puzzle, index) === '#') return;
    cell.classList.toggle('selected', !completed && index === state.selected);
    cell.classList.toggle('in-word', !completed && preferences.highlight && active.cells.includes(index));
    cell.classList.toggle('penciled', state.pencil[index]); cell.classList.toggle('wrong', wrong.has(index)); cell.classList.toggle('revealed', state.revealed[index]);
    cell.querySelector('.letter').textContent = state.letters[index]; cell.tabIndex = index === state.selected ? 0 : -1;
    cell.disabled = paused;
    const row = Math.floor(index / puzzle.size) + 1, col = index % puzzle.size + 1;
    cell.setAttribute('aria-label', `Row ${row}, column ${col}, ${state.letters[index] || 'empty'}${state.pencil[index] ? ', pencil' : ''}${wrong.has(index) ? ', incorrect' : ''}`);
    cell.setAttribute('aria-pressed', String(index === state.selected));
  });
  clueNodes.forEach(({button, entry}) => {
    const selected = !completed && active === entry;
    button.classList.toggle('active', selected); button.classList.toggle('crossing', !completed && entry.direction !== state.direction && entry.cells.includes(state.selected));
    button.classList.toggle('finished', entry.cells.every(i => state.letters[i]));
    button.setAttribute('aria-current', String(selected));
  });
  if (userInteracted && !completed) {
    const indicator = document.createElement('span'); indicator.className = 'clue-indicator'; indicator.textContent = `${active.number} ${state.direction === 'across' ? 'Across' : 'Down'}`;
    const copy = document.createElement('span'); copy.textContent = active.clue; $('#current-clue').replaceChildren(indicator, copy);
  } else $('#current-clue').textContent = 'Remember to share this puzzle with your friends!';
  const total = puzzle.rows.join('').split('').filter(letter => letter !== '#').length;
  $('#progress-text').textContent = `${state.letters.filter(Boolean).length} / ${total}`;
  $('#timer-value').textContent = formatTime(state.seconds); $('#timer').setAttribute('aria-label', completed ? 'Puzzle completed' : paused ? 'Resume timer' : 'Pause timer');
  $('#timer').disabled = completed; $('.timer-symbol').textContent = completed ? '✓' : paused ? '>' : 'II';
  $('#timer').hidden = !preferences.timer;
  document.body.classList.toggle('large-clues', preferences.large);
  $('#pause-overlay').hidden = !paused; $('#completion').hidden = !completed;
  if (completed) $('#completion-copy').textContent = `Solved in ${formatTime(state.seconds)}${state.revealed.some(Boolean) ? ' with revealed letters' : ''}.`;
}
function checkCompletion() {
  const solved = isSolved(puzzle, state.letters);
  if (solved && !completed) { completed = true; toast('Puzzle complete!'); }
  else if (!solved) completed = false;
}
function advanceClue(step) {
  const ordered = [...entries.across, ...entries.down]; const current = ordered.indexOf(activeEntry());
  const next = ordered[(current + step + ordered.length) % ordered.length];
  select(next.cells.find(i => !state.letters[i]) ?? next.cells[0], next.direction);
}
function moveInWord(step) {
  const active = activeEntry(), position = active.cells.indexOf(state.selected);
  const remaining = active.cells.slice(position + 1);
  const next = step > 0 && preferences.skip ? remaining.find(index => !state.letters[index]) : active.cells[position + step];
  if (next !== undefined) select(next);
}
function putLetter(letter) {
  if (paused) return;
  const index = state.selected; state.letters[index] = letter; state.pencil[index] = pencilMode; state.revealed[index] = false; wrong.delete(index);
  checkCompletion(); moveInWord(1); render(); persist();
}
function eraseLetter(backwards = true) {
  if (paused) return;
  if (!state.letters[state.selected] && backwards) moveInWord(-1);
  const index = state.selected; state.letters[index] = ''; state.pencil[index] = false; state.revealed[index] = false; wrong.delete(index); checkCompletion(); render(); persist();
}
function onKey(event) {
  if (paused || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'Escape') { event.preventDefault(); $('#game-menu summary').focus(); return; }
  if (/^[a-zA-Z]$/.test(event.key)) { event.preventDefault(); putLetter(event.key.toUpperCase()); return; }
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); select(state.selected, opposite(state.direction)); return; }
  if (event.key === 'Tab') { event.preventDefault(); advanceClue(event.shiftKey ? -1 : 1); return; }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault(); eraseLetter(event.key === 'Backspace'); return;
  }
  const moves = {ArrowLeft: [0, -1, 'across'], ArrowRight: [0, 1, 'across'], ArrowUp: [-1, 0, 'down'], ArrowDown: [1, 0, 'down']};
  if (moves[event.key]) {
    event.preventDefault(); const [dr, dc, direction] = moves[event.key];
    let row = Math.floor(state.selected / puzzle.size) + dr, col = state.selected % puzzle.size + dc;
    while (row >= 0 && row < puzzle.size && col >= 0 && col < puzzle.size) {
      const index = row * puzzle.size + col;
      if (answerAt(puzzle, index) !== '#') { select(index, direction); return; }
      row += dr; col += dc;
    }
    select(state.selected, direction);
  }
}
function setPaused(value) { if (completed) return; paused = value; render(); if (paused) $('#resume').focus(); else cellNodes[state.selected].focus({preventScroll:true}); }
function check(cells) {
  let incorrect = 0, filled = 0;
  for (const index of cells) { wrong.delete(index); if (state.letters[index]) { filled++; if (state.letters[index] !== answerAt(puzzle, index)) { wrong.add(index); incorrect++; } } }
  render(); toast(incorrect ? `${incorrect} ${incorrect === 1 ? 'letter needs' : 'letters need'} another look.` : filled ? 'All filled letters look good!' : 'Fill in a few letters first.');
}
function reveal(cells) {
  for (const index of cells) { if (answerAt(puzzle, index) === '#') continue; state.letters[index] = answerAt(puzzle, index); state.pencil[index] = false; state.revealed[index] = true; wrong.delete(index); }
  checkCompletion(); render(); persist();
}
function confirm(title, copy, label, action) {
  confirmAction = action; $('#confirm-title').textContent = title; $('#confirm-copy').textContent = copy; $('#confirm-ok').textContent = label; $('#confirm-dialog').showModal();
}
function openLibrary() {
  const library = $('#puzzle-library'); library.replaceChildren();
  for (const item of puzzles) {
    const button = document.createElement('button'); button.className = `library-puzzle${item.id === puzzle.id ? ' current' : ''}`;
    const preview = document.createElement('span'); preview.className = 'mini-preview'; preview.style.setProperty('--size', item.size); preview.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < item.size ** 2; i++) { const square = document.createElement('span'); if (answerAt(item, i) === '#') square.className = 'black'; preview.append(square); }
    const content = document.createElement('span'), title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = item.title; detail.textContent = `${item.size} × ${item.size} · ${item.description}`; content.append(title, detail);
    const arrow = document.createElement('span'); arrow.textContent = item.id === puzzle.id ? '✓' : '→';
    button.append(preview, content, arrow); button.addEventListener('click', () => { loadPuzzle(item.id); $('#library-dialog').close(); cellNodes[state.selected].focus({preventScroll:true}); });
    library.append(button);
  }
  $('#library-dialog').showModal();
}
$('#timer').addEventListener('click', () => setPaused(!paused)); $('#resume').addEventListener('click', () => setPaused(false));
$('#pencil').addEventListener('click', () => { pencilMode = !pencilMode; $('#pencil').setAttribute('aria-pressed', String(pencilMode)); $('#game-menu').open = false; toast(pencilMode ? 'Pencil mode on.' : 'Pencil mode off.'); if (!paused) cellNodes[state.selected].focus({preventScroll:true}); });
$('#open-help').addEventListener('click', () => $('#help-dialog').showModal());
$('#open-library').addEventListener('click', openLibrary); $('#next-puzzle').addEventListener('click', openLibrary);
$('#browse-library').addEventListener('click', openLibrary);
$('#menu-library').addEventListener('click', () => { $('#game-menu').open = false; openLibrary(); });
document.querySelectorAll('[data-puzzle]').forEach(button => button.addEventListener('click', () => { loadPuzzle(button.dataset.puzzle); cellNodes[state.selected].focus({preventScroll:true}); }));
document.querySelectorAll('.dialog-done').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$('#reset').addEventListener('click', () => { $('#game-menu').open = false; confirm('Restart this puzzle?', 'This clears the letters and timer for this puzzle. Your other puzzles will stay saved.', 'Restart puzzle', () => { state = restoreProgress(puzzle, null); wrong.clear(); completed = false; paused = false; userInteracted = false; render(); persist(); cellNodes[state.selected].focus({preventScroll:true}); }); });
$('#confirm-cancel').addEventListener('click', () => $('#confirm-dialog').close());
$('#confirm-ok').addEventListener('click', () => { $('#confirm-dialog').close(); confirmAction?.(); });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  button.closest('details').open = false;
  const action = button.dataset.action, all = cellNodes.map((_, i) => i).filter(i => answerAt(puzzle, i) !== '#');
  if (paused) { toast('Resume the puzzle first.'); return; }
  if (action === 'check-word') check(activeEntry().cells);
  if (action === 'check-puzzle') check(all);
  if (action === 'reveal-letter') reveal([state.selected]);
  if (action === 'reveal-word') reveal(activeEntry().cells);
  if (action === 'reveal-puzzle') confirm('Reveal the whole puzzle?', 'Every answer will be filled in. You can always restart if you want to try solving it yourself.', 'Reveal puzzle', () => reveal(all));
  if (!document.querySelector('dialog[open]')) cellNodes[state.selected].focus({preventScroll:true});
}));
document.addEventListener('click', event => { const menu = $('#game-menu'); if (!menu.contains(event.target)) menu.open = false; });
document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#game-menu').open = false; });
document.addEventListener('paste', event => {
  if (!event.target.closest?.('.cell') || paused) return;
  event.preventDefault(); const text = event.clipboardData.getData('text').toUpperCase().replace(/[^A-Z]/g, '');
  const cells = activeEntry().cells.slice(activeEntry().cells.indexOf(state.selected));
  for (let i = 0; i < Math.min(text.length, cells.length); i++) { const index = cells[i]; state.letters[index] = text[i]; state.pencil[index] = pencilMode; state.revealed[index] = false; wrong.delete(index); }
  checkCompletion(); render(); persist();
});
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), elapsed = Math.floor((now - lastTick) / 1000);
  if (elapsed < 1) return;
  lastTick = now;
  if (!paused && !completed && !document.hidden && !document.querySelector('dialog[open]')) { state.seconds += elapsed; $('#timer-value').textContent = formatTime(state.seconds); persist(); }
}, 250);
document.addEventListener('visibilitychange', () => { lastTick = Date.now(); });
const layoutUpdated = readSaved('crossr:layout-version') !== 2;
loadPuzzle(layoutUpdated ? puzzles[0].id : readSaved('crossr:last-puzzle'));
try { localStorage.setItem('crossr:layout-version', JSON.stringify(2)); } catch { /* Browser storage may be unavailable. */ }
const touchKeyboard = $('#touch-keyboard');
for (const letters of ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']) {
  const row = document.createElement('div'); row.className = 'key-row';
  for (const letter of letters) { const button = document.createElement('button'); button.textContent = letter; button.setAttribute('aria-label', `Enter ${letter}`); button.addEventListener('click', () => putLetter(letter)); row.append(button); }
  if (letters === 'ZXCVBNM') {
    const direction = document.createElement('button'); direction.textContent = '⇄'; direction.setAttribute('aria-label', 'Switch direction'); direction.addEventListener('click', () => { if (!paused) select(state.selected, opposite(state.direction), false); }); row.prepend(direction);
    const backspace = document.createElement('button'); backspace.textContent = '⌫'; backspace.setAttribute('aria-label', 'Erase letter'); backspace.addEventListener('click', () => eraseLetter()); row.append(backspace);
  }
  touchKeyboard.append(row);
}
new ResizeObserver(([entry]) => { $('.workspace').style.setProperty('--board-height', `${entry.contentRect.width}px`); }).observe($('.board-wrap'));

$('#open-result').addEventListener('click', () => {
  $('#result-status').textContent = completed ? `${puzzle.title} — complete!` : `${puzzle.title} — in progress`;
  $('#result-time').textContent = formatTime(state.seconds);
  $('#result-filled').textContent = $('#progress-text').textContent;
  $('#result-revealed').textContent = state.revealed.filter(Boolean).length;
  $('#result-dialog').showModal();
});
$('#open-settings').addEventListener('click', () => $('#settings-dialog').showModal());
for (const name of ['timer', 'highlight', 'skip', 'large']) {
  const input = $(`#setting-${name}`); input.checked = preferences[name];
  input.addEventListener('change', () => {
    preferences[name] = input.checked;
    try { localStorage.setItem('crossr:preferences', JSON.stringify(preferences)); } catch { storageAvailable = false; }
    render(); persist();
  });
}
$('#print').addEventListener('click', () => window.print());
$('#share').addEventListener('click', async () => {
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname)) {
    toast('Sharing will be available once this puzzle is hosted online.'); return;
  }
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Puzzle link copied.');
  } catch { toast('Copy the address from your browser to share this puzzle.'); }
});
