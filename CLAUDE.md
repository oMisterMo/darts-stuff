# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build, lint or test tooling, and no dependencies. To run the app, open `index.html` in a recent browser (it uses nested CSS).

## Architecture

The markup is in `index.html`, the styles in `styles.css`, and all the JavaScript in `script.js`, a plain script (not a module) loaded at the end of `<body>`. The page has three screens, `#home`, `#game` and `#results`, switched with `showScreen` (the `hidden` attribute). The home screen offers 1, 2 or 3 darts a turn. Each opens the `#options` `<dialog>` (singles, doubles, triples, number of turns), and OK starts a game. The player types the turn's total.

- **Game state:** `game` holds the game in progress, or `null` outside a game. The number pad and keyboard only respond while `game.waiting` is true, which `checkAnswer` clears while it shows the result before the next turn. `game.darts` holds the current turn's darts.
- **Throwing:** `buildTargets` lists the beds allowed by the options (25 counts as a single, bull as a double). `randomPointIn` picks a point in a bed in millimetres, kept `WIRE_MARGIN` away from the wires, so `scoreAt` at that point always agrees with the target. `randomPointAwayFrom` retries to keep darts in a turn `DART_SPACING` apart. `drawDartboard` draws the turn's darts last.
- **Throw animation:** `throwTurn` gives each dart a `thrownAt` time, spaced `THROW_DURATION + THROW_PAUSE` apart, and runs `animateTurn` on `requestAnimationFrame` until the last impact ring fades. `drawDart` works out each dart's flight from the current time, so a resize mid-throw just redraws the same frame. `game.waiting` turns on when the last dart lands. The animation is skipped under `prefers-reduced-motion`, but the pause between darts stays.
- **Units:** all radii in `dartboard` are millimetres from the board centre. Convert with `px(mm)` when drawing. `scoreAt` divides by `dartboard.scale` instead, so drawing and hit detection always agree.
- **Segments:** `SEGMENT_NUMBERS` lists the numbers clockwise from the top. Segment `i` is centred on `-90° + i * 18°` in canvas angles (clockwise, since y points down). Even indexes have black singles with red rings, odd ones cream singles with green rings.
- **Draw order:** `drawDartboard` paints in layers, so the order of its calls matters. Wires are drawn over the segments and bulls, then numbers, then the darts.
- **Scaling:** the page is one screen tall. The number pad takes the height it needs, and the canvas fills the rest of the width and height. `resizeCanvas` runs from a `ResizeObserver`. It matches the canvas resolution to its displayed size (times `devicePixelRatio`), centres the board and sets `dartboard.scale` so the board fits the shorter side. Drawing and `scoreAt` both use CSS pixels, so mouse `offsetX`/`offsetY` can be passed straight in. The number pad is a CSS grid sized with `clamp()` so it stays large on phones.
