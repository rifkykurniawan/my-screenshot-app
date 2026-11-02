# Week 2: Capture Modes

Goal: more ways to get an image into the editor.
Main files: `background.js`, `popup/*`, `capture/*`, `manifest.json`, `editor/editor.js`.

> Schedule note: the calendar runs one day ahead from Day 10 onward.
> Day 9 was not implemented, so Day 10 took over its slot.

## Day 8: Crop tool
- [x] Add Crop tool with a draggable region and apply/cancel
- [x] Keep annotations aligned after cropping
- **Done when:** the cropped image is what gets copied.

## Day 9: Paste / drop image — not implemented (skipped)
- [ ] Open the editor from a pasted image (`Ctrl+V`)
- [ ] Support drag-and-drop of image files
- **Done when:** an external image can be annotated.

## Day 10: Select-area capture
- [x] Inject an overlay with a content script to drag a region
- [x] Crop the visible capture to that region
- [x] Add a popup button and a shortcut
- [x] Possible new permission: `scripting`
- **Done when:** only the chosen region opens in the editor.

## Day 11: Full-page scrolling capture
- [x] Scroll the page and capture each slice
- [x] Stitch slices on a canvas, handling fixed headers
- **Done when:** a long page produces one tall image.

## Day 12: Delayed capture
- [x] Add 3s/5s/10s timer options in the popup
- [x] Show a countdown badge
- **Done when:** the capture fires after the chosen delay.

## Day 13: Rest / catch-up

## Day 14: Capture history (Milestone M2)
- [ ] Save the last N captures (thumbnails) in storage
- [ ] Show a history list in the popup with re-open and delete
- [ ] Cap storage use
- **Done when:** Milestone M2 passes a manual test.
