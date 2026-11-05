# Darts

A browser-based darts collection of tips, guides, drills and more. Drawn on an HTML canvas with plain JavaScript. There are no dependencies or build step.

## Status

Early work in progress. So far the board is drawn:

- Standard clock-face numbering (20 at the top)
- Single, treble and double rings in black, cream, red and green
- Outer bull (25) and inner bull (50)
- Silver wires (the spider) around the rings and between segments
- A counting drill: choose 1 dart (2 and 3 darts are coming), pick singles, doubles and/or triples and 5, 10, 20 or 50 darts. A dart lands on the board and you type its score on the number pad. Wrong answers show the right one, and the end screen lists your score and mistakes
- A large number pad for entering scores. The keyboard's digits, Backspace and Enter work too
- The board and pad scale down to fit phone screens

## Running

Open `index.html` in a browser. The page uses nested CSS, so it needs a recent browser.

## Project layout

| File | Contains |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Styles |
| `script.js` | Drawing, scoring, the number pad and the game |
| `favicon.svg` | Browser tab icon |
| `apple-touch-icon.png` | 180×180 home screen icon for iPhone and iPad |

The drawing functions in `script.js` are:

| Function | Draws |
| --- | --- |
| `drawBoardEdge` | Black disc behind the numbers |
| `drawSegments` | Singles, trebles and doubles for all 20 segments |
| `drawBulls` | Outer and inner bull |
| `drawWires` | Ring and radial wires |
| `drawNumbers` | Segment numbers around the edge |

`drawDartboard` calls these in order, and later layers paint over earlier ones. `scoreAt` turns a canvas point into a score.

## Configuration

Board sizes are in the `dartboard` object, in millimetres from the centre, following the standard tournament board (double ring outer edge at 170 mm). `dartboard.scale` converts millimetres to pixels. It is recalculated whenever the canvas changes size, so the board always fits the space above the number pad.

`WIRE_MARGIN` keeps random darts clear of the wires, and `RIGHT_DELAY` and `WRONG_DELAY` set how long an answer is shown before the next dart.
