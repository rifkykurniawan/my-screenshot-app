# Week 1: Annotation Tools (Oct 12-18)

Goal: extend the editor beyond rectangle/arrow/text.
Main files: `editor/editor.js`, `editor/editor.html`, `editor/editor.css`.

## Day 1 (Mon Oct 12): Line and ellipse tools
- [ ] Add Line tool (`L`) and Ellipse tool (`O`) to the toolbar
- [ ] Reuse the drag-to-draw flow and the color/stroke settings
- [ ] Support undo/redo for both
- **Done when:** both shapes can be drawn, undone and copied.

## Day 2 (Tue Oct 13): Highlighter
- [ ] Add Highlighter tool (`H`) with a semi-transparent wide stroke
- [ ] Add an opacity setting
- **Done when:** text under the highlight stays readable.

## Day 3 (Wed Oct 14): Blur / pixelate redaction
- [ ] Add Blur tool (`B`) drawn as a region
- [ ] Implement pixelate on the base image (sample blocks)
- [ ] Add a blur/pixelate toggle and an intensity slider
- **Done when:** sensitive text is unreadable in the copied image.

## Day 4 (Thu Oct 15): Numbered step markers
- [ ] Add Step tool (`N`) that places circles numbered 1, 2, 3...
- [ ] Auto-increment, and renumber on undo
- **Done when:** markers are legible at all stroke sizes.

## Day 5 (Fri Oct 16): Select, move, resize, delete
- [ ] Store annotations as objects (type, geometry, style)
- [ ] Add Select tool (`V`) with hit testing
- [ ] Add move, resize handles and `Delete` key
- **Done when:** any existing annotation can be edited after drawing.

## Day 6 (Sat Oct 17): Eraser, clear all, week review
- [ ] Add Eraser (click removes an annotation)
- [ ] Add a "Clear all" button with undo support
- [ ] Update README shortcuts, fix week bugs
- **Done when:** Milestone M1 passes a manual test.

## Day 7 (Sun Oct 18): Rest / catch-up
