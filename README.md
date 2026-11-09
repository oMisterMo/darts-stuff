# Darts

A browser-based darts collection of tips, guides, drills and more. Drawn on an HTML canvas with plain JavaScript. There are no dependencies or build step.

## Status

Early work in progress. So far the board is drawn:

- Standard clock-face numbering (20 at the top)
- Single, treble and double rings in black, cream, red and green
- Outer bull (25) and inner bull (50)
- Silver wires (the spider) around the rings and between segments
- A counting drill: choose 1, 2 or 3 darts a turn, pick singles, doubles and/or triples and 5, 10, 20 or 50 turns and whether to show the throw animation and shadows (each mode remembers its last choices). The darts are thrown at the board one after another, and once they've all landed you type their total on the number pad. Wrong answers show the breakdown, such as `T20 + 5 + D3 = 71`, and the end screen lists your score and mistakes
- 301 and 501 for playing on a real board: 1 to 4 players, with or without double out (remembered between games). Click a player's name on the scoreboard to change it. Each player types their visit's score on the number pad and the scoreboard shows what's left, the 3-dart average and the last visit. Scores three darts can't make (like 179) are refused, busts score nothing, the ↶ button undoes the last visit, and Play again passes the throw to the next player
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

`LANDING_SPREAD` sets how close to the middle of a bed darts land, `WIRE_MARGIN` keeps them clear of the wires and `DART_SPACING` keeps darts in a turn apart. `THROW_DURATION`, `THROW_PAUSE` and `IMPACT_DURATION` time the throw animation. `RIGHT_DELAY`, `WRONG_DELAY` and `WRONG_DELAY_PER_DART` set how long an answer is shown before the next turn.
