# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build, lint or test tooling, and no dependencies. To run the app, open `index.html` in a recent browser (it uses nested CSS).

## Architecture

Everything is in `index.html`: markup, styles and one inline script that draws the board once on load. There is no animation loop yet, and there are no game rules. The number pad below the board only shows the entered score.

- **Units:** all radii in `dartboard` are millimetres from the board centre. Convert with `px(mm)` when drawing. `scoreAt` divides by `dartboard.scale` instead, so drawing and hit detection always agree.
- **Segments:** `SEGMENT_NUMBERS` lists the numbers clockwise from the top. Segment `i` is centred on `-90° + i * 18°` in canvas angles (clockwise, since y points down). Even indexes have black singles with red rings, odd ones cream singles with green rings.
- **Draw order:** `drawDartboard` paints in layers, so the order of its calls matters. Wires are drawn over the segments and bulls, and numbers last.
- **Scaling:** the page is one screen tall. The number pad takes the height it needs, and the canvas fills the rest of the width and height. `resizeCanvas` runs from a `ResizeObserver`. It matches the canvas resolution to its displayed size (times `devicePixelRatio`), centres the board and sets `dartboard.scale` so the board fits the shorter side. Drawing and `scoreAt` both use CSS pixels, so mouse `offsetX`/`offsetY` can be passed straight in. The number pad is a CSS grid sized with `clamp()` so it stays large on phones.
