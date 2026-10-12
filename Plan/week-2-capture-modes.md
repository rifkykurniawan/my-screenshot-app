# Week 2: Capture Modes (Oct 19-25)

Goal: more ways to get an image into the editor.
Main files: `background.js`, `popup/*`, `capture/*`, `manifest.json`, `editor/editor.js`.

## Day 8 (Mon Oct 19): Crop tool
- [ ] Add Crop tool with a draggable region and apply/cancel
- [ ] Keep annotations aligned after cropping
- **Done when:** the cropped image is what gets copied.

## Day 9 (Tue Oct 20): Paste / drop image
- [ ] Open the editor from a pasted image (`Ctrl+V`)
- [ ] Support drag-and-drop of image files
- **Done when:** an external image can be annotated.

## Day 10 (Wed Oct 21): Select-area capture
- [ ] Inject an overlay with a content script to drag a region
- [ ] Crop the visible capture to that region
- [ ] Add a popup button and a shortcut
- [ ] Possible new permission: `scripting`
- **Done when:** only the chosen region opens in the editor.

## Day 11 (Thu Oct 22): Full-page scrolling capture
- [ ] Scroll the page and capture each slice
- [ ] Stitch slices on a canvas, handling fixed headers
- **Done when:** a long page produces one tall image.

## Day 12 (Fri Oct 23): Delayed capture
- [ ] Add 3s/5s/10s timer options in the popup
- [ ] Show a countdown badge
- **Done when:** the capture fires after the chosen delay.

## Day 13 (Sat Oct 24): Capture history
- [ ] Save the last N captures (thumbnails) in storage
- [ ] Show a history list in the popup with re-open and delete
- [ ] Cap storage use
- **Done when:** Milestone M2 passes a manual test.

## Day 14 (Sun Oct 25): Rest / catch-up
