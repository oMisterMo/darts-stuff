# Darts

A browser-based darts collection of tips, guides, drills and more. Drawn on an HTML canvas with plain JavaScript. There are no dependencies or build step.

## Status

Early work in progress. So far the board is drawn:

- Standard clock-face numbering (20 at the top)
- Single, treble and double rings in black, cream, red and green
- Outer bull (25) and inner bull (50)
- Silver wires (the spider) around the rings and between segments
- Hovering over the board shows what a dart there would score, such as `T20 (60)`
- A large number pad below the board for entering a visit score (0–180). The keyboard's digits, Backspace and Enter work too. Entered scores are only shown for now
- The board and pad scale down to fit phone screens

## Running

Open `index.html` in a browser. The page uses nested CSS, so it needs a recent browser.

## Project layout

| File | Contains |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | Styles |
| `script.js` | Drawing, scoring and the number pad |

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
