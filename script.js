// Fraction of the canvas's shorter side the board's diameter takes up.
const BOARD_FILL = 0.96;

const BACKGROUND_COLOR = '#2B2B2B66';
const BLACK = '#1A1A1A';
const CREAM = '#F3E9D2';
const RED = '#C8102E';
const GREEN = '#00873E';
const WIRE_COLOR = '#C0C0C0';
const NUMBER_COLOR = '#FFFFFF';

// Clockwise from the top.
const SEGMENT_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENT_NUMBERS.length;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Canvas size in CSS pixels, set by resizeCanvas.
let canvasWidth = 0;
let canvasHeight = 0;

// Radii are in millimetres, measured from the centre to the outside of each
// ring's wire, following the standard tournament board. `scale` converts them
// to pixels, so hit detection and drawing share the same numbers.
const dartboard = {
    // Centre and pixels per millimetre, set by resizeCanvas
    x: 0,
    y: 0,
    scale: 1,
    innerBull: 6.35,
    outerBull: 15.9,
    trebleInner: 99,
    trebleOuter: 107,
    doubleInner: 162,
    doubleOuter: 170,
    // Outer edge of the black number ring
    boardEdge: 225
};

function px(mm) {
    return mm * dartboard.scale;
}

// Segment i is centred on angle -90° + i * 18°. Canvas angles run clockwise
// because y points down, which matches the order of SEGMENT_NUMBERS.
function segmentStartAngle(index) {
    return -Math.PI / 2 + (index - 0.5) * SEGMENT_ANGLE;
}

// 20 and every second segment after it have black singles with red rings.
function segmentColors(index) {
    return index % 2 === 0 ? { single: BLACK, ring: RED } : { single: CREAM, ring: GREEN };
}

function drawRingSector(innerRadius, outerRadius, startAngle, endAngle, color) {
    const { x, y } = dartboard;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, px(outerRadius), startAngle, endAngle);
    ctx.arc(x, y, px(innerRadius), endAngle, startAngle, true);
    ctx.closePath();
    ctx.fill();
}

function drawBoardEdge() {
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.arc(dartboard.x, dartboard.y, px(dartboard.boardEdge), 0, Math.PI * 2);
    ctx.fill();
}

function drawSegments() {
    const { outerBull, trebleInner, trebleOuter, doubleInner, doubleOuter } = dartboard;

    SEGMENT_NUMBERS.forEach((_, index) => {
        const start = segmentStartAngle(index);
        const end = start + SEGMENT_ANGLE;
        const colors = segmentColors(index);

        drawRingSector(outerBull, trebleInner, start, end, colors.single);
        drawRingSector(trebleInner, trebleOuter, start, end, colors.ring);
        drawRingSector(trebleOuter, doubleInner, start, end, colors.single);
        drawRingSector(doubleInner, doubleOuter, start, end, colors.ring);
    });
}

function drawBulls() {
    const { x, y, innerBull, outerBull } = dartboard;

    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.arc(x, y, px(outerBull), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(x, y, px(innerBull), 0, Math.PI * 2);
    ctx.fill();
}

// The spider: ring wires plus radial wires from the outer bull to the double ring.
function drawWires() {
    const { x, y, innerBull, outerBull, trebleInner, trebleOuter, doubleInner, doubleOuter } = dartboard;

    ctx.strokeStyle = WIRE_COLOR;
    ctx.lineWidth = 1;

    [innerBull, outerBull, trebleInner, trebleOuter, doubleInner, doubleOuter].forEach(radius => {
        ctx.beginPath();
        ctx.arc(x, y, px(radius), 0, Math.PI * 2);
        ctx.stroke();
    });

    SEGMENT_NUMBERS.forEach((_, index) => {
        const angle = segmentStartAngle(index);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * px(outerBull), y + Math.sin(angle) * px(outerBull));
        ctx.lineTo(x + Math.cos(angle) * px(doubleOuter), y + Math.sin(angle) * px(doubleOuter));
        ctx.stroke();
    });
}

// Numbers sit upright, centred between the double ring and the board edge.
function drawNumbers() {
    const { x, y, doubleOuter, boardEdge } = dartboard;
    const radius = px((doubleOuter + boardEdge) / 2);

    ctx.fillStyle = NUMBER_COLOR;
    ctx.font = `bold ${Math.round(px(28))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    SEGMENT_NUMBERS.forEach((number, index) => {
        const angle = -Math.PI / 2 + index * SEGMENT_ANGLE;
        ctx.fillText(number, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    });
}

function drawDartboard() {
    // Clear the last frame, or a flying dart leaves a trail outside the board
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawBoardEdge();
    drawSegments();
    drawBulls();
    drawWires();
    drawNumbers();
    const now = performance.now();
    game?.darts.forEach(dart => drawDart(dart, now));
}

// Returns what a dart landing at canvas point (x, y) scores, e.g.
// { label: 'T20', score: 60 }, or a miss outside the double ring.
function scoreAt(x, y) {
    const { innerBull, outerBull, trebleInner, trebleOuter, doubleInner, doubleOuter } = dartboard;
    const dx = x - dartboard.x;
    const dy = y - dartboard.y;
    const distance = Math.hypot(dx, dy) / dartboard.scale;

    if (distance <= innerBull) return { label: 'Bull', score: 50 };
    if (distance <= outerBull) return { label: '25', score: 25 };
    if (distance > doubleOuter) return { label: 'Miss', score: 0 };

    // Angle clockwise from the top, shifted half a segment so 20 starts at 0.
    const fromTop = Math.atan2(dx, -dy) + SEGMENT_ANGLE / 2;
    const turn = Math.PI * 2;
    const index = Math.floor((((fromTop % turn) + turn) % turn) / SEGMENT_ANGLE);
    const number = SEGMENT_NUMBERS[index];

    if (distance >= trebleInner && distance <= trebleOuter) return { label: `T${number}`, score: number * 3 };
    if (distance >= doubleInner) return { label: `D${number}`, score: number * 2 };
    return { label: `${number}`, score: number };
}

// ---- Throwing darts ----

// Keeps random darts this far (mm) from a wire, so it is always clear which
// bed they landed in.
const WIRE_MARGIN = 1.5;
// Darts land in this central fraction of a bed's depth and width, so they
// sit well inside it rather than near the wires.
const LANDING_SPREAD = 0.5;
// Radius of the dart marker in mm (it never drops below 5 px)
const DART_RADIUS = 4;
const DART_COLOR = '#2E7DFF';

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

// The beds a dart can be aimed at for the chosen options. The outer bull goes
// with the singles and the bull with the doubles, as in a darts checkout.
function buildTargets({ singles, doubles, triples }) {
    const targets = [];
    SEGMENT_NUMBERS.forEach((number, index) => {
        if (singles) targets.push({ kind: 'single', index, label: `${number}`, score: number });
        if (doubles) targets.push({ kind: 'double', index, label: `D${number}`, score: number * 2 });
        if (triples) targets.push({ kind: 'triple', index, label: `T${number}`, score: number * 3 });
    });
    if (singles) targets.push({ kind: 'outerBull', label: '25', score: 25 });
    if (doubles) targets.push({ kind: 'bull', label: 'Bull', score: 50 });
    return targets;
}

// A random radius around the middle of the band from `inner` to `outer`,
// at least WIRE_MARGIN from either wire.
function nearMiddle(inner, outer) {
    const middle = (inner + outer) / 2;
    const spread = Math.min((outer - inner) / 2 * LANDING_SPREAD, (outer - inner) / 2 - WIRE_MARGIN);
    return randomBetween(middle - spread, middle + spread);
}

// A random point inside the target's bed, in mm from the board centre, so
// the dart stays in place when the board is resized.
function randomPointIn(target) {
    const { innerBull, outerBull, trebleInner, trebleOuter, doubleInner, doubleOuter } = dartboard;
    let radius;
    let angle = randomBetween(0, Math.PI * 2);

    if (target.kind === 'bull') {
        radius = nearMiddle(0, innerBull);
    } else if (target.kind === 'outerBull') {
        radius = nearMiddle(innerBull, outerBull);
    } else {
        if (target.kind === 'triple') radius = nearMiddle(trebleInner, trebleOuter);
        else if (target.kind === 'double') radius = nearMiddle(doubleInner, doubleOuter);
        // Inner or outer single, equally likely
        else if (Math.random() < 0.5) radius = nearMiddle(outerBull, trebleInner);
        else radius = nearMiddle(trebleOuter, doubleInner);

        // Around the middle of the segment, and never so close to a radial
        // wire that the marker touches it
        const middle = segmentStartAngle(target.index) + SEGMENT_ANGLE / 2;
        const clearance = SEGMENT_ANGLE / 2 - (DART_RADIUS + WIRE_MARGIN) / radius;
        const spread = Math.max(0, Math.min(SEGMENT_ANGLE / 2 * LANDING_SPREAD, clearance));
        angle = randomBetween(middle - spread, middle + spread);
    }

    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

// Darts in the same turn try to land at least this far apart (mm) so their
// markers don't hide each other. Small beds like the bull can't always manage it.
const DART_SPACING = 10;

function randomPointAwayFrom(target, darts) {
    let point;
    for (let attempt = 0; attempt < 30; attempt++) {
        point = randomPointIn(target);
        if (darts.every(dart => Math.hypot(dart.point.x - point.x, dart.point.y - point.y) >= DART_SPACING)) break;
    }
    return point;
}

// Throw animation timings in ms. Each dart flies for THROW_DURATION, then
// the next is thrown after THROW_PAUSE. The impact ring shows on landing.
// With the animation turned off darts appear instantly, still THROW_PAUSE apart.
const THROW_DURATION = 680;
const THROW_PAUSE = 1550;
const IMPACT_DURATION = 250;

function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}

// When a dart lands, and when its impact ring has faded
function landsAt(dart) {
    return dart.thrownAt + dart.flight;
}

function settlesAt(dart) {
    return landsAt(dart) + (dart.flight ? IMPACT_DURATION : 0);
}

function drawMarker(x, y, radius, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = DART_COLOR;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// A dart flies up from below the board in an arc, shrinking as it moves
// away from the player, while its shadow (if on) closes in on the landing
// spot. Darts with no flight time just appear.
function drawDart(dart, now) {
    if (now < dart.thrownAt) return;

    const x = dartboard.x + px(dart.point.x);
    const y = dartboard.y + px(dart.point.y);
    const radius = Math.max(5, px(DART_RADIUS));

    if (now < landsAt(dart)) {
        const t = (now - dart.thrownAt) / dart.flight;
        const e = easeOutCubic(t);
        const startX = dartboard.x;
        const startY = canvasHeight + radius * 3;
        const lift = Math.sin(Math.PI * t) * canvasHeight * 0.15;

        if (dart.shadow) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * e})`;
            ctx.beginPath();
            ctx.arc(x, y, radius * (1 + (1 - e)), 0, Math.PI * 2);
            ctx.fill();
        }

        drawMarker(
            startX + (x - startX) * e,
            startY + (y - startY) * e - lift,
            radius * (1 + 2.5 * (1 - e)),
            Math.min(1, t * 4)
        );
        return;
    }

    drawMarker(x, y, radius, 1);

    const impact = (now - landsAt(dart)) / IMPACT_DURATION;
    if (dart.flight && impact < 1) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - impact})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius * (1 + 2 * impact), 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ---- Number pad ----

// Three darts can score at most 180 in a visit.
const MAX_VISIT_SCORE = 180;
const MAX_PAD_DIGITS = 3;

const padDisplay = document.getElementById('pad-display');
const padKeys = document.getElementById('pad-keys');

// Greys out the keys while darts are being thrown
function setPadEnabled(enabled) {
    padKeys.classList.toggle('disabled', !enabled);
}
let padEntry = '';

function showPadEntry() {
    padDisplay.textContent = padEntry;
    padDisplay.className = padEntry === '' || entryValid(Number(padEntry)) ? '' : 'invalid';
}

// The pad takes input while a drill turn waits for an answer, and at any
// time during a 301 or 501 game.
function padReady() {
    return Boolean(game?.waiting || match);
}

// A drill answer can be any total up to 180, a match visit only one that
// three darts can actually score.
function entryValid(score) {
    return match ? VISIT_SCORES.has(score) : score <= MAX_VISIT_SCORE;
}

function pressDigit(digit) {
    if (!padReady() || padEntry.length >= MAX_PAD_DIGITS) return;
    // Avoids entries like "07"
    padEntry = padEntry === '0' ? digit : padEntry + digit;
    showPadEntry();
}

function pressDelete() {
    if (!padReady()) return;
    padEntry = padEntry.slice(0, -1);
    showPadEntry();
}

function pressEnter() {
    if (!padReady() || padEntry === '' || !entryValid(Number(padEntry))) return;
    if (match) submitVisit(Number(padEntry));
    else checkAnswer(Number(padEntry));
}

// Touches act on touchstart, not click, which only fires once the finger
// lifts. Cancelling the touchstart stops the click that would follow, but
// also :active, so the `pressed` class shows the press instead. Each finger
// gets its own touchstart, so two-thumb typing works. Mice still use click.
function onPress(button, action) {
    button.addEventListener('touchstart', event => {
        event.preventDefault();
        // Cancelling the touch also stops focus moving, so finish editing
        // a player's name before the press redraws the scoreboard
        document.activeElement?.blur();
        button.classList.add('pressed');
        action();
    }, { passive: false });
    ['touchend', 'touchcancel'].forEach(type => {
        button.addEventListener(type, () => button.classList.remove('pressed'));
    });
    button.addEventListener('click', action);
}

document.querySelectorAll('#pad-keys [data-digit]').forEach(button => {
    onPress(button, () => pressDigit(button.dataset.digit));
});
onPress(document.getElementById('pad-delete'), pressDelete);
onPress(document.getElementById('pad-enter'), pressEnter);

document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || gameScreen.hidden) return;
    // Typing a player's name
    if (event.target instanceof HTMLInputElement) return;
    if (/^[0-9]$/.test(event.key)) pressDigit(event.key);
    else if (event.key === 'Backspace') pressDelete();
    else if (event.key === 'Enter') pressEnter();
    else return;
    event.preventDefault();
});

// ---- Screens and game flow ----

// How long the result is shown before the next turn, in ms. A wrong answer
// stays longer, with extra time per dart to read the breakdown.
const RIGHT_DELAY = 600;
const WRONG_DELAY = 1200;
const WRONG_DELAY_PER_DART = 600;

const homeScreen = document.getElementById('home');
const gameScreen = document.getElementById('game');
const resultsScreen = document.getElementById('results');
const optionsDialog = document.getElementById('options');
const optionsForm = optionsDialog.querySelector('form');
const optionsTitle = document.getElementById('options-title');
const countLegend = document.getElementById('count-legend');
const optionsError = document.getElementById('options-error');
const progressText = document.getElementById('progress');
const tallyText = document.getElementById('tally');
const undoButton = document.getElementById('undo');
const boardArea = document.getElementById('board');
const scoreboard = document.getElementById('scoreboard');
const resultsScore = document.getElementById('results-score');
const resultsList = document.getElementById('results-misses');

// The game in progress, or null on the home and results screens.
// `waiting` is true while the player can type an answer.
let game = null;
// The 301 or 501 game in progress, or null. Only one of game and match is set.
let match = null;
// Starts the last game again, for the Play again button
let replay = null;
let nextTurnTimer = 0;
let animationFrame = 0;
// Darts per turn for the mode picked on the home screen
let chosenDarts = 1;

function showScreen(screen) {
    [homeScreen, gameScreen, resultsScreen].forEach(s => { s.hidden = s !== screen; });
}

// The game screen shows the board and tally for the drill, or the
// scoreboard and undo button for 301 and 501.
function showGameScreen(isMatch) {
    boardArea.hidden = isMatch;
    tallyText.hidden = isMatch;
    scoreboard.hidden = !isMatch;
    undoButton.hidden = !isMatch;
    showScreen(gameScreen);
}

// Reads the checkboxes directly rather than with FormData, which skips
// disabled ones like Shadows when the animation is off.
function readOptions() {
    const { elements } = optionsForm;
    return {
        darts: chosenDarts,
        singles: elements.singles.checked,
        doubles: elements.doubles.checked,
        triples: elements.triples.checked,
        count: Number([...elements.count].find(radio => radio.checked).value),
        animation: elements.animation.checked,
        shadows: elements.shadows.checked
    };
}

// Shadows only show during the throw animation
function updateShadowsToggle() {
    optionsForm.elements.shadows.disabled = !optionsForm.elements.animation.checked;
}
optionsForm.elements.animation.addEventListener('change', updateShadowsToggle);

// Animation is off by default for players who ask for reduced motion
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    optionsForm.elements.animation.checked = false;
    updateShadowsToggle();
}

// The options last used for each mode are kept in localStorage, under
// `darts-options-1`, `darts-options-2` and `darts-options-3`. The form's
// initial state in index.html is the default for a mode with none saved.
const defaultOptions = readOptions();

function storageKey(darts) {
    return `darts-options-${darts}`;
}

function loadSaved(key, defaults) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && typeof saved === 'object') return { ...defaults, ...saved };
    } catch {
        // Storage blocked or the saved value is broken, use the defaults
    }
    return defaults;
}

function save(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage blocked or full, the options just won't be remembered
    }
}

function loadOptions(darts) {
    return loadSaved(storageKey(darts), defaultOptions);
}

function saveOptions({ darts, singles, doubles, triples, count, animation, shadows }) {
    save(storageKey(darts), { singles, doubles, triples, count, animation, shadows });
}

// Sets the form to `options`. A count with no matching radio button falls
// back to the default.
function showOptions(options) {
    const { elements } = optionsForm;
    elements.singles.checked = Boolean(options.singles);
    elements.doubles.checked = Boolean(options.doubles);
    elements.triples.checked = Boolean(options.triples);
    elements.animation.checked = Boolean(options.animation);
    elements.shadows.checked = Boolean(options.shadows);
    updateShadowsToggle();
    const counts = [...elements.count];
    const radio = counts.find(r => Number(r.value) === options.count)
        ?? counts.find(r => Number(r.value) === defaultOptions.count);
    radio.checked = true;
}

// With one dart a turn the count is darts, otherwise it is turns.
function turnName(darts) {
    return darts === 1 ? 'Dart' : 'Turn';
}

document.querySelectorAll('#modes [data-darts]').forEach(button => {
    button.addEventListener('click', () => {
        chosenDarts = Number(button.dataset.darts);
        optionsTitle.textContent = button.textContent;
        countLegend.textContent = `${turnName(chosenDarts)}s`;
        showOptions(loadOptions(chosenDarts));
        optionsError.hidden = true;
        optionsDialog.showModal();
    });
});

optionsForm.addEventListener('submit', event => {
    if (event.submitter?.value !== 'ok') return;
    const options = readOptions();
    if (!options.singles && !options.doubles && !options.triples) {
        event.preventDefault();
        optionsError.hidden = false;
        return;
    }
    saveOptions(options);
    startGame(options);
});

function startGame(options) {
    replay = () => startGame(options);
    match = null;
    game = {
        targets: buildTargets(options),
        perTurn: options.darts,
        flight: options.animation ? THROW_DURATION : 0,
        shadows: options.shadows,
        count: options.count,
        turn: 0,
        correct: 0,
        misses: [],
        darts: [],
        waiting: false
    };
    showGameScreen(false);
    throwTurn();
}

// Throws the turn's darts one after another. The pad accepts an answer once
// the last one has landed.
function throwTurn() {
    const start = performance.now();
    game.darts = [];
    for (let i = 0; i < game.perTurn; i++) {
        const target = randomItem(game.targets);
        game.darts.push({
            ...target,
            point: randomPointAwayFrom(target, game.darts),
            thrownAt: start + i * (game.flight + THROW_PAUSE),
            flight: game.flight,
            shadow: game.shadows
        });
    }
    game.turn++;
    game.waiting = false;
    setPadEnabled(false);
    padEntry = '';
    showPadEntry();
    progressText.textContent = `${turnName(game.perTurn)} ${game.turn} / ${game.count}`;
    tallyText.textContent = `✓ ${game.correct}`;
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animateTurn);
}

// Redraws every frame until the last dart has landed and settled.
function animateTurn(now) {
    if (!game) return;
    drawDartboard();

    const last = game.darts[game.darts.length - 1];
    if (!game.waiting && now >= landsAt(last)) {
        game.waiting = true;
        setPadEnabled(true);
    }
    if (now < settlesAt(last)) animationFrame = requestAnimationFrame(animateTurn);
}

// e.g. "T20 + 5 + D3 = 71"
function describeTurn(darts) {
    const total = darts.reduce((sum, dart) => sum + dart.score, 0);
    return { text: darts.map(dart => dart.label).join(' + '), total };
}

function checkAnswer(answer) {
    const { text, total } = describeTurn(game.darts);
    const right = answer === total;
    game.waiting = false;

    if (right) {
        game.correct++;
        tallyText.textContent = `✓ ${game.correct}`;
        padDisplay.className = 'right';
    } else {
        game.misses.push({ text, total, answer });
        padDisplay.textContent = `${text} = ${total}`;
        padDisplay.className = 'wrong';
    }

    const delay = right ? RIGHT_DELAY : WRONG_DELAY + game.perTurn * WRONG_DELAY_PER_DART;
    nextTurnTimer = setTimeout(() => {
        if (game.turn < game.count) throwTurn();
        else showResults();
    }, delay);
}

function showResults() {
    resultsScore.textContent = `${game.correct} / ${game.count} correct`;
    resultsList.replaceChildren(...game.misses.map(miss => {
        const item = document.createElement('li');
        item.textContent = `${miss.text} is ${miss.total}, you said ${miss.answer}`;
        return item;
    }));
    game = null;
    showScreen(resultsScreen);
}

function quitGame() {
    clearTimeout(nextTurnTimer);
    cancelAnimationFrame(animationFrame);
    game = null;
    match = null;
    showScreen(homeScreen);
}

document.getElementById('quit').addEventListener('click', quitGame);
document.getElementById('menu').addEventListener('click', quitGame);
document.getElementById('again').addEventListener('click', () => replay());

// ---- 301 and 501 on a real board ----

// Each player starts on 301 or 501 and types the score of each visit (up
// to three darts) on the number pad. The first to reach exactly 0 wins.
// With double out the last dart must be a double or the bull. A visit that
// goes below 0, leaves 1 or, with double out, reaches 0 without a possible
// double finish is bust: it scores nothing.

// Each starting score keeps its own last options
function matchStorageKey(start) {
    return `darts-options-${start}`;
}

const matchDialog = document.getElementById('match-options');
const matchForm = matchDialog.querySelector('form');
const matchTitle = document.getElementById('match-title');
// The starting score of the game the dialog is open for
let matchStart = 501;

// What one dart can score: a miss, any single, double or treble, 25 and bull
const DART_SCORES = [0, 25, 50, ...SEGMENT_NUMBERS.flatMap(n => [n, n * 2, n * 3])];
const DOUBLE_SCORES = [50, ...SEGMENT_NUMBERS.map(n => n * 2)];

function sums(first, second) {
    const totals = new Set();
    first.forEach(a => second.forEach(b => totals.add(a + b)));
    return totals;
}

const TWO_DART_SCORES = sums(DART_SCORES, DART_SCORES);
// Totals three darts can score. Rules out 163, 166, 169, 172, 173, 175,
// 176, 178 and 179.
const VISIT_SCORES = sums(TWO_DART_SCORES, DART_SCORES);
// Totals a visit can finish on with a double last. The highest is 170, and
// it rules out 159, 162, 163, 165, 166, 168 and 169.
const DOUBLE_FINISHES = sums(TWO_DART_SCORES, DOUBLE_SCORES);

// The usual double-out checkout for every finish from 170 down to 2, as on
// a checkout chart: fewest darts, and finishing on a favourite double.
const DOUBLE_OUT_CHECKOUTS = Object.fromEntries(Object.entries({
    170: 'T20 T20 Bull', 167: 'T20 T19 Bull', 164: 'T20 T18 Bull', 161: 'T20 T17 Bull',
    160: 'T20 T20 D20', 158: 'T20 T20 D19', 157: 'T20 T19 D20', 156: 'T20 T20 D18',
    155: 'T20 T19 D19', 154: 'T20 T18 D20', 153: 'T20 T19 D18', 152: 'T20 T20 D16',
    151: 'T20 T17 D20', 150: 'T20 T18 D18', 149: 'T20 T19 D16', 148: 'T20 T16 D20',
    147: 'T20 T17 D18', 146: 'T20 T18 D16', 145: 'T20 T15 D20', 144: 'T20 T20 D12',
    143: 'T20 T17 D16', 142: 'T20 T14 D20', 141: 'T20 T19 D12', 140: 'T20 T20 D10',
    139: 'T20 T13 D20', 138: 'T20 T18 D12', 137: 'T20 T19 D10', 136: 'T20 T20 D8',
    135: 'T20 T17 D12', 134: 'T20 T14 D16', 133: 'T20 T19 D8', 132: 'T20 T16 D12',
    131: 'T20 T13 D16', 130: 'T20 T20 D5', 129: 'T19 T16 D12', 128: 'T18 T14 D16',
    127: 'T20 T17 D8', 126: 'T19 T19 D6', 125: '25 T20 D20', 124: 'T20 T16 D8',
    123: 'T19 T16 D9', 122: 'T18 T20 D4', 121: 'T20 T11 D14', 120: 'T20 20 D20',
    119: 'T19 T12 D13', 118: 'T20 18 D20', 117: 'T20 17 D20', 116: 'T20 16 D20',
    115: 'T20 15 D20', 114: 'T20 14 D20', 113: 'T20 13 D20', 112: 'T20 12 D20',
    111: 'T20 19 D16', 110: 'T20 Bull', 109: 'T20 9 D20', 108: 'T20 16 D16',
    107: 'T19 Bull', 106: 'T20 10 D18', 105: 'T20 13 D16', 104: 'T18 Bull',
    103: 'T20 3 D20', 102: 'T20 10 D16', 101: 'T17 Bull', 100: 'T20 D20',
    99: 'T19 10 D16', 98: 'T20 D19', 97: 'T19 D20', 96: 'T20 D18', 95: 'T19 D19',
    94: 'T18 D20', 93: 'T19 D18', 92: 'T20 D16', 91: 'T17 D20', 90: 'T20 D15',
    89: 'T19 D16', 88: 'T16 D20', 87: 'T17 D18', 86: 'T18 D16', 85: 'T15 D20',
    84: 'T20 D12', 83: 'T17 D16', 82: 'Bull D16', 81: 'T19 D12', 80: 'T20 D10',
    79: 'T19 D11', 78: 'T18 D12', 77: 'T19 D10', 76: 'T20 D8', 75: 'T17 D12',
    74: 'T14 D16', 73: 'T19 D8', 72: 'T16 D12', 71: 'T13 D16', 70: 'T18 D8',
    69: 'T19 D6', 68: 'T20 D4', 67: 'T17 D8', 66: 'T10 D18', 65: '25 D20',
    64: 'T16 D8', 63: 'T13 D12', 62: 'T10 D16', 61: 'T15 D8', 60: '20 D20',
    59: '19 D20', 58: '18 D20', 57: '17 D20', 56: '16 D20', 55: '15 D20',
    54: '14 D20', 53: '13 D20', 52: '20 D16', 51: '19 D16', 50: 'Bull',
    49: '17 D16', 48: '16 D16', 47: '15 D16', 46: '6 D20', 45: '13 D16',
    44: '12 D16', 43: '11 D16', 42: '10 D16', 41: '9 D16', 40: 'D20',
    39: '7 D16', 38: 'D19', 37: '5 D16', 36: 'D18', 35: '3 D16', 34: 'D17',
    33: '1 D16', 32: 'D16', 31: '15 D8', 30: 'D15', 29: '13 D8', 28: 'D14',
    27: '11 D8', 26: 'D13', 25: '9 D8', 24: 'D12', 23: '7 D8', 22: 'D11',
    21: '5 D8', 20: 'D10', 19: '3 D8', 18: 'D9', 17: '1 D8', 16: 'D8',
    15: '7 D4', 14: 'D7', 13: '5 D4', 12: 'D6', 11: '3 D4', 10: 'D5',
    9: '1 D4', 8: 'D4', 7: '3 D2', 6: 'D3', 5: '1 D2', 4: 'D2', 3: '1 D1', 2: 'D1'
}).map(([score, route]) => [score, route.split(' ')]));

// Every dart as a label and score, highest first, to set up a finish
const LABELLED_DARTS = [
    ...SEGMENT_NUMBERS.flatMap(n => [[`T${n}`, n * 3], [`D${n}`, n * 2], [`${n}`, n]]),
    ['Bull', 50], ['25', 25]
].sort((a, b) => b[1] - a[1]);
// The last dart of a single-out finish, the plainest bed first: 18, not D9 or T6
const bedRank = ([label]) => ({ D: 1, T: 2 })[label[0]] ?? 0;
const FINISHING_DARTS = [...LABELLED_DARTS].sort((a, b) => bedRank(a) - bedRank(b));

// Exactly `darts` darts that score `score`, the highest first, or null
function finishIn(score, darts) {
    if (darts === 1) {
        const last = FINISHING_DARTS.find(([, value]) => value === score);
        return last ? [last[0]] : null;
    }
    for (const [label, value] of LABELLED_DARTS) {
        const rest = value < score && finishIn(score - value, darts - 1);
        if (rest) return [label, ...rest];
    }
    return null;
}

// The darts to finish on `remaining` in as few as possible, or null if it
// can't be done in a visit
function checkout(remaining) {
    if (match.doubleOut) return DOUBLE_OUT_CHECKOUTS[remaining] ?? null;
    if (!VISIT_SCORES.has(remaining)) return null;
    for (let darts = 1; darts <= 3; darts++) {
        const route = finishIn(remaining, darts);
        if (route) return route;
    }
    return null;
}

function readMatchOptions() {
    const { elements } = matchForm;
    return {
        players: Number([...elements.players].find(radio => radio.checked).value),
        doubleOut: elements.doubleOut.checked
    };
}

const defaultMatchOptions = readMatchOptions();

function showMatchOptions(options) {
    const { elements } = matchForm;
    const radios = [...elements.players];
    const radio = radios.find(r => Number(r.value) === options.players)
        ?? radios.find(r => Number(r.value) === defaultMatchOptions.players);
    radio.checked = true;
    elements.doubleOut.checked = Boolean(options.doubleOut);
}

document.querySelectorAll('[data-start]').forEach(button => {
    button.addEventListener('click', () => {
        matchStart = Number(button.dataset.start);
        matchTitle.textContent = matchStart;
        showMatchOptions(loadSaved(matchStorageKey(matchStart), defaultMatchOptions));
        matchDialog.showModal();
    });
});

matchForm.addEventListener('submit', event => {
    if (event.submitter?.value !== 'ok') return;
    const options = readMatchOptions();
    save(matchStorageKey(matchStart), options);
    startMatch({ ...options, start: matchStart });
});

// `starter` is the player who throws first. Play again passes it on to the
// next player, as players take turns to start legs.
function startMatch({ start, players, doubleOut, starter = 0 }) {
    replay = () => startMatch({ start, players, doubleOut, starter: (starter + 1) % players });
    game = null;
    // Everything else is worked out from the visits, so undo just drops the last one
    match = { start, players, doubleOut, starter, visits: [] };
    padEntry = '';
    setPadEnabled(true);
    showGameScreen(true);
    showMatch();
}

// Player names, set by clicking a name on the scoreboard. Shared by 301
// and 501 and kept between games. A blank name means "Player N".
const NAMES_STORAGE_KEY = 'darts-player-names';

function loadNames() {
    const { names } = loadSaved(NAMES_STORAGE_KEY, { names: [] });
    return Array.isArray(names) ? names.map(name => (typeof name === 'string' ? name : '')) : [];
}

function playerName(player) {
    return loadNames()[player] || `Player ${player + 1}`;
}

function setPlayerName(player, name) {
    const names = loadNames();
    names[player] = name;
    save(NAMES_STORAGE_KEY, { names });
}

// Swaps the name for a text field. Enter or clicking away keeps the new
// name, Escape keeps the old one.
function editName(player, button) {
    const input = document.createElement('input');
    input.className = 'name';
    input.maxLength = 20;
    input.value = loadNames()[player] ?? '';
    input.placeholder = `Player ${player + 1}`;
    input.setAttribute('aria-label', `Player ${player + 1} name`);

    let done = false;
    const finish = keep => {
        if (done) return;
        done = true;
        if (keep) setPlayerName(player, input.value.trim());
        if (match) showMatch();
    };
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') finish(true);
        else if (event.key === 'Escape') finish(false);
        else return;
        event.preventDefault();
    });
    input.addEventListener('blur', () => finish(true));

    button.replaceWith(input);
    input.focus();
    input.select();
}

function currentPlayer() {
    return (match.starter + match.visits.length) % match.players;
}

function playerStats(player) {
    const visits = match.visits.filter(visit => visit.player === player);
    const scored = visits.reduce((sum, visit) => sum + (visit.bust ? 0 : visit.score), 0);
    return { remaining: match.start - scored, scored, darts: visits.length * 3, last: visits.at(-1) };
}

// Points per three darts. Every visit counts as three darts, the finishing one too.
function average({ scored, darts }) {
    return darts ? (scored / darts * 3).toFixed(1) : '–';
}

function isBust(score, remaining) {
    const left = remaining - score;
    if (left < 0) return true;
    if (!match.doubleOut) return false;
    return left === 1 || (left === 0 && !DOUBLE_FINISHES.has(score));
}

function submitVisit(score) {
    const player = currentPlayer();
    const { remaining } = playerStats(player);
    const bust = isBust(score, remaining);
    match.visits.push({ player, score, bust });
    padEntry = '';

    if (!bust && score === remaining) {
        showMatchResults(player);
        return;
    }
    showMatch();
    if (bust) {
        padDisplay.textContent = `Bust, ${playerName(player)} stays on ${remaining}`;
        padDisplay.className = 'wrong';
    }
}

function undoVisit() {
    if (!match?.visits.length) return;
    match.visits.pop();
    padEntry = '';
    showMatch();
}

undoButton.addEventListener('click', undoVisit);

function element(tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
}

function nameButton(player) {
    const button = element('button', 'name', playerName(player));
    button.title = 'Change name';
    button.addEventListener('click', () => editName(player, button));
    return button;
}

function showMatch() {
    const current = currentPlayer();
    scoreboard.replaceChildren(...Array.from({ length: match.players }, (_, player) => {
        const stats = playerStats(player);
        const last = stats.last ? (stats.last.bust ? 'Bust' : stats.last.score) : '–';
        const card = element('div', player === current ? 'player active' : 'player', '');
        const summary = element('div', 'summary', '');
        summary.append(
            nameButton(player),
            element('div', 'remaining', stats.remaining),
            element('div', 'stats', `Avg ${average(stats)} · Last ${last}`)
        );
        // On a finish, the usual checkout runs down the left of the card
        const route = checkout(stats.remaining);
        if (route) {
            const list = element('ol', 'checkout', '');
            list.setAttribute('aria-label', 'Checkout');
            list.append(...route.map(dart => element('li', '', dart)));
            card.append(list);
        }
        card.append(summary);
        return card;
    }));

    const visit = Math.floor(match.visits.length / match.players) + 1;
    progressText.textContent = match.players === 1
        ? `${match.start} · Visit ${visit}`
        : `${match.start} · ${playerName(current)} to throw`;
    undoButton.disabled = match.visits.length === 0;
    showPadEntry();
}

function showMatchResults(winner) {
    const stats = Array.from({ length: match.players }, (_, player) => playerStats(player));
    resultsScore.textContent = match.players === 1
        ? `Checked out in ${stats[0].darts} darts`
        : `${playerName(winner)} wins`;
    resultsList.replaceChildren(...stats.map((s, player) => {
        const left = s.remaining ? `, ${s.remaining} left` : '';
        const name = match.players === 1 ? '' : `${playerName(player)}: `;
        return element('li', '', `${name}${average(s)} average, ${s.darts} darts${left}`);
    }));
    match = null;
    showScreen(resultsScreen);
}

// Matches the canvas to the size it is shown at, so it fills the full width
// and stays sharp on high-DPI screens. Drawing and scoreAt both work in CSS
// pixels, and the transform maps them onto the device pixels.
function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    canvasWidth = canvas.clientWidth;
    canvasHeight = canvas.clientHeight;
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    dartboard.x = canvasWidth / 2;
    dartboard.y = canvasHeight / 2;
    dartboard.scale = (Math.min(canvasWidth, canvasHeight) * BOARD_FILL) / 2 / dartboard.boardEdge;

    drawDartboard();
}

new ResizeObserver(resizeCanvas).observe(canvas);
