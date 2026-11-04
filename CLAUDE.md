# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build, lint or test tooling, and no dependencies. To run the app, open `index.html` in a recent browser (it uses nested CSS).

## Architecture

Everything is in `index.html`: markup, styles and one inline script that draws the board once on load. There is no animation loop yet, and there are no game rules. The number pad below the board only shows the entered score.

- **Units:** all radii in `dartboard` are millimetres from the board centre. Convert with `px(mm)` when drawing. `scoreAt` divides by `dartboard.scale` instead, so drawing and hit detection always agree.
- **Segments:** `SEGMENT_NUMBERS` lists the numbers clockwise from the top. Segment `i` is centred on `-90° + i * 18°` in canvas angles (clockwise, since y points down). Even indexes have black singles with red rings, odd ones cream singles with green rings.
- **Draw order:** `drawDartboard` paints in layers, so the order of its calls matters. Wires are drawn over the segments and bulls, and numbers last.
- **Scaling:** the canvas keeps its 800×600 drawing size and CSS scales it to the page width. Mouse positions must go through `canvasPoint` before `scoreAt`. The number pad is a CSS grid sized with `clamp()` so it stays large on phones.
