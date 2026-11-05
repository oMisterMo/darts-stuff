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
    padDisplay.className = Number(padEntry) > MAX_VISIT_SCORE ? 'invalid' : '';
}

function pressDigit(digit) {
    if (!game?.waiting || padEntry.length >= MAX_PAD_DIGITS) return;
    // Avoids entries like "07"
    padEntry = padEntry === '0' ? digit : padEntry + digit;
    showPadEntry();
}

function pressDelete() {
    if (!game?.waiting) return;
    padEntry = padEntry.slice(0, -1);
    showPadEntry();
}

function pressEnter() {
    if (!game?.waiting || padEntry === '' || Number(padEntry) > MAX_VISIT_SCORE) return;
    checkAnswer(Number(padEntry));
}

document.querySelectorAll('#pad-keys [data-digit]').forEach(button => {
    button.addEventListener('click', () => pressDigit(button.dataset.digit));
});
document.getElementById('pad-delete').addEventListener('click', pressDelete);
document.getElementById('pad-enter').addEventListener('click', pressEnter);

document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || gameScreen.hidden) return;
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

// The game in progress, or null on the home and results screens.
// `waiting` is true while the player can type an answer.
let game = null;
let lastOptions = null;
let nextTurnTimer = 0;
let animationFrame = 0;
// Darts per turn for the mode picked on the home screen
let chosenDarts = 1;

function showScreen(screen) {
    [homeScreen, gameScreen, resultsScreen].forEach(s => { s.hidden = s !== screen; });
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

function loadOptions(darts) {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey(darts)));
        if (saved && typeof saved === 'object') return { ...defaultOptions, ...saved };
    } catch {
        // Storage blocked or the saved value is broken, use the defaults
    }
    return defaultOptions;
}

function saveOptions({ darts, singles, doubles, triples, count, animation, shadows }) {
    try {
        localStorage.setItem(storageKey(darts), JSON.stringify({ singles, doubles, triples, count, animation, shadows }));
    } catch {
        // Storage blocked or full, the options just won't be remembered
    }
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
    lastOptions = options;
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
    showScreen(gameScreen);
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
    document.getElementById('results-score').textContent = `${game.correct} / ${game.count} correct`;
    const list = document.getElementById('results-misses');
    list.replaceChildren(...game.misses.map(miss => {
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
    showScreen(homeScreen);
}

document.getElementById('quit').addEventListener('click', quitGame);
document.getElementById('menu').addEventListener('click', quitGame);
document.getElementById('again').addEventListener('click', () => startGame(lastOptions));

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
