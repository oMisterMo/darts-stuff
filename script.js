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
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    drawBoardEdge();
    drawSegments();
    drawBulls();
    drawWires();
    drawNumbers();
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

// Three darts can score at most 180 in a visit.
const MAX_VISIT_SCORE = 180;
const MAX_PAD_DIGITS = 3;

const padDisplay = document.getElementById('pad-display');
let padEntry = '';

function showPadEntry() {
    padDisplay.textContent = padEntry;
    padDisplay.classList.toggle('invalid', Number(padEntry) > MAX_VISIT_SCORE);
}

function pressDigit(digit) {
    if (padEntry.length >= MAX_PAD_DIGITS) return;
    // Avoids entries like "07"
    padEntry = padEntry === '0' ? digit : padEntry + digit;
    showPadEntry();
}

function pressDelete() {
    padEntry = padEntry.slice(0, -1);
    showPadEntry();
}

// Nothing uses the score yet, entering it just clears the pad.
function pressEnter() {
    if (padEntry === '' || Number(padEntry) > MAX_VISIT_SCORE) return;
    padEntry = '';
    showPadEntry();
}

document.querySelectorAll('#pad-keys [data-digit]').forEach(button => {
    button.addEventListener('click', () => pressDigit(button.dataset.digit));
});
document.getElementById('pad-delete').addEventListener('click', pressDelete);
document.getElementById('pad-enter').addEventListener('click', pressEnter);

document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) pressDigit(event.key);
    else if (event.key === 'Backspace') pressDelete();
    else if (event.key === 'Enter') pressEnter();
    else return;
    event.preventDefault();
});

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
