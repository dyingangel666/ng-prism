# Measuring

Guides and rulers tell you where things sit on the canvas; the measuring tool answers a narrower, more literal question — exactly how many pixels sit between these two points, in this layout, right now. It is not a correctness check. It does not know what the right answer should have been; it only reports the one that is actually rendered.

## Turning it on

The measuring tool is a toggle button on the floating canvas rail, next to guides, rulers and the viewport-width constraint. Switching it on is a working-environment preference, not a statement about the component you happen to be looking at: like zoom, guides and rulers, it is written to `localStorage` and comes back exactly as you left it the next time you open the showcase, in any component, in any variant.

## Measuring a distance

Press and drag from one point to another; releasing the pointer finishes the measurement. While dragging, each endpoint latches onto the nearest border, padding or content edge of whatever element sits under the pointer, as long as one is within 8 screen pixels — screen pixels, not CSS pixels, because the precision of a hand should feel the same whether the canvas is zoomed to 50% or 200%.

A latched endpoint draws a short dotted tick retracing the exact edge it locked onto. That echo is deliberately a footnote and not a second measurement — shorter than the edge itself and noticeably fainter than the measurement line — but it earns its place: a 2px border puts the border, padding and content edges exactly 2 pixels apart, and without the echo there is no way to tell which of the three was actually meant.

Nothing in range is a perfectly valid outcome too. A point with nothing to snap to simply drops wherever the pointer is, in the open space between elements — the tool measures open space exactly as readily as it measures an edge.

The value sits at the midpoint of the line for anything long enough to hold it; short measurements move the number aside instead of letting it collide with its own end ticks. The result is also announced through a polite live region, so the measurement is available to a screen reader, not only to whoever is looking at the canvas.

## Comparing two elements

Alt-click an element to fix it as the anchor. From there, holding Alt and moving the pointer over other elements draws every gap between the anchor and whatever is currently underneath it — up to four lines, one per side.

Two distinct readings come out of the same four numbers. When the hovered element sits entirely inside the anchor, the four lines read as insets — exactly the reading you want to make a container's padding visible on every side at once. When the two don't contain one another, only the sides that actually face open space draw a line at all; a side with nothing between the boxes draws nothing, and two elements that overlap on both axes report nothing on any side — there is no gap there to put a number on, which is the correct statement, not a tool that gave up.

The anchor stays fixed across repeated alt-hovers: let go of Alt, move the pointer elsewhere, hold Alt again, and you're still comparing against the same element. It only changes on a new Alt-click, on switching variant or component, or on turning the tool off. Hovering back onto the anchor itself draws nothing — there is no distance from an element to itself.

## Keeping measurements

A finished drag is already a pinned measurement; there is no separate step to pin it. Releasing the pointer drops it straight into a row below the canvas, each one shown as a small chip with its value and its own remove button.

That row lives below the canvas rather than floating over it because the space above the canvas is already spoken for — the background pill on the left, the dimension line in the centre, the toolrail on the right — and a fourth floating surface there would be the first to collide with one of the other three.

Pins outlive switching the tool off and back on; the toggle only clears whatever draft was mid-drag and drops the alt-hover anchor, so an accidental tap on the rail button doesn't cost you measurements you already took. What does clear them is navigating to a different variant or component: a pinned number describes this particular rendering, and carrying it into a different layout would present a stale measurement as though it still applied. None of it is ever written to storage — a reload starts exactly as clean as switching variants does.

## Keyboard

Arrow keys nudge the active endpoint of a measurement that is already being dragged, one CSS pixel per press; hold Shift for a 10px step. Enter commits the measurement early, without waiting for the pointer to come back up. Escape discards it.

All four only operate on a draft that already exists — see below for what that means in practice.

## What it does not do

**It cannot be started from the keyboard.** A measurement only ever begins from a pointer-down; arrow keys, Enter and Escape all act on a draft a pointer has already opened, and press any of them with nothing running and nothing happens. The design called for Tab to step through the specimen's snap targets as the keyboard equivalent of a pointer-down — arguably the more precise input of the two, since edges are exactly what you want to measure in the first place — and that was never built. Tab is deliberately left untouched here rather than repurposed as a plain stepping key, so it stays free for that mechanism once it exists. What the real interaction should be is still an open product question: a tool covering the whole canvas cannot simply take Tab for its own use without first deciding how a keyboard user gets back out of it, and that decision has not been made. If you rely on keyboard operation, treat this as a hard limit today, not an oversight to work around.

**It measures geometry, not cascade.** A point knows which edge it landed on; it does not know which CSS property drew that edge. If you need to know whether a 16px gap is `padding`, `margin` or a flex `gap`, that is what [`@ng-prism/plugin-box-model`](plugins/box-model.md) is for — it reads `getComputedStyle` rather than pixels on screen. For the same reason, turning the measuring tool on suppresses every panel overlay, box-model's included, so the two are never competing for the canvas at the same time; see [Canvas State — Measuring](architecture/canvas-state.md#measuring) for why that split is temporary rather than permanent.

**It does not judge a value.** A measurement is reported, not graded — there is no design-token scale it checks a number against, and no warning for a gap that doesn't land on one. It states distances; deciding whether 18px should have been 16px is still a human call.
