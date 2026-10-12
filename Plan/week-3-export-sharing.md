# Week 3: Export and Sharing (Oct 26 - Nov 1)

Goal: get the image out of the editor in more ways than the clipboard.
Main files: `editor/editor.js`, `editor/editor.html`, `manifest.json`.

## Day 15 (Mon Oct 26): Save as PNG/JPEG/WebP
- [ ] Add a Save button and `Ctrl+S`
- [ ] Add a format selector and a quality slider
- [ ] Add the `downloads` permission (or use an anchor download)
- **Done when:** a file is saved in each format.

## Day 16 (Tue Oct 27): Export to PDF
- [ ] Generate a single-page PDF from the canvas (small local library or manual PDF writer)
- **Done when:** the PDF opens with the full image.

## Day 17 (Wed Oct 28): Copy as Markdown / base64
- [ ] Add a copy menu: image, data URL, Markdown image tag
- **Done when:** each option pastes the right content.

## Day 18 (Thu Oct 29): Filename templates
- [ ] Add a template such as `{domain}_{date}_{time}`
- [ ] Sanitize invalid characters
- **Done when:** saved files follow the template.

## Day 19 (Fri Oct 30): Upload to custom endpoint
- [ ] Add a settings field for an upload URL (user opt-in)
- [ ] POST the image and copy the returned link
- [ ] Add `host_permissions` only for the configured host, and document the privacy impact
- **Done when:** an upload to a test endpoint returns a link.

## Day 20 (Sat Oct 31): Export review and fixes
- [ ] Test all export paths with large images
- [ ] Update README
- **Done when:** Milestone M3 passes a manual test.

## Day 21 (Sun Nov 1): Rest / catch-up
