# Week 2: Capture Modes (Oct 20-26)

Goal: more ways to get an image into the editor.
Main files: `background.js`, `popup/*`, `capture/*`, `manifest.json`, `editor/editor.js`.

## Day 8 (Tue Oct 20): Crop tool
- [x] Add Crop tool with a draggable region and apply/cancel
- [x] Keep annotations aligned after cropping
- **Done when:** the cropped image is what gets copied.

## Day 9 (Wed Oct 21): Paste / drop image
- [ ] Open the editor from a pasted image (`Ctrl+V`)
- [ ] Support drag-and-drop of image files
- **Done when:** an external image can be annotated.

## Day 10 (Thu Oct 22): Select-area capture
- [x] Inject an overlay with a content script to drag a region
- [x] Crop the visible capture to that region
- [x] Add a popup button and a shortcut
- [x] Possible new permission: `scripting`
- **Done when:** only the chosen region opens in the editor.

## Day 11 (Fri Oct 23): Full-page scrolling capture
- [x] Scroll the page and capture each slice
- [x] Stitch slices on a canvas, handling fixed headers
- **Done when:** a long page produces one tall image.

## Day 12 (Sat Oct 24): Delayed capture
- [ ] Add 3s/5s/10s timer options in the popup
- [ ] Show a countdown badge
- **Done when:** the capture fires after the chosen delay.

## Day 13 (Sun Oct 25): Sunday rest / catch-up

## Day 14 (Mon Oct 26): Capture history (Milestone M2)
- [ ] Save the last N captures (thumbnails) in storage
- [ ] Show a history list in the popup with re-open and delete
- [ ] Cap storage use
- **Done when:** Milestone M2 passes a manual test.
