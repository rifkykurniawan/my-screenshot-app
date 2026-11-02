# Week 3: Export and Sharing

Goal: get the image out of the editor in more ways than the clipboard.
Main files: `editor/editor.js`, `editor/editor.html`, `manifest.json`.

## Day 15: Save as PNG/JPEG/WebP
- [x] Add a Save button and `Ctrl+S`
- [x] Add a format selector and a quality slider
- [x] Add the `downloads` permission (or use an anchor download)
- **Done when:** a file is saved in each format.

## Day 16: Export to PDF
- [x] Generate a single-page PDF from the canvas (small local library or manual PDF writer)
- **Done when:** the PDF opens with the full image.

## Day 17: Filename templates
- [x] Add a template such as `{domain}_{date}_{time}`
- [x] Sanitize invalid characters
- **Done when:** saved files follow the template.

## Day 18: Upload to custom endpoint
- [ ] Add a settings field for an upload URL (user opt-in)
- [ ] POST the image and copy the returned link
- [ ] Add `host_permissions` only for the configured host, and document the privacy impact
- **Done when:** an upload to a test endpoint returns a link.

## Day 19: Rest / catch-up

## Day 20: Export review and fixes (Milestone M3)
- [ ] Test all export paths with large images
- [ ] Update README
- **Done when:** Milestone M3 passes a manual test.
