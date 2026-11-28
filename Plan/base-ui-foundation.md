# Base UI Foundation: 5-Day Plan

Status: Day 4 code complete, Chrome check pending
Started: 2026-11-23
Last updated: 2026-11-27

One shared base layer (tokens, base styles, shared components) for `popup/` and `editor/`, so both surfaces stop carrying duplicated colors, buttons, chips, toggles and focus rules. No feature changes, no JS rewrite.

Main files: `styles/tokens.css` (new), `styles/base.css` (new), `styles/components.css` (new), `popup/popup.html`, `popup/popup.css`, `editor/editor.html`, `editor/editor.css`, `README.md`.

## Progress

| Day | Focus | Status |
| :--- | :--- | :--- |
| 1 | Direction, tokens, base layer | Code complete, check pending |
| 2 | Type and color correctness | Code complete, check pending |
| 3 | Shared components, part 1 | Code complete, check pending |
| 4 | Shared components, part 2, states | Code complete, check pending |
| 5 | Verification and audit | Not started |

Update the Status cell to In progress or Done as you go. The checkboxes in each day are the detailed log.

## Direction (derived from current UI, confirm before Day 1)

Design read: "Reading this as: capture and annotation tool for developers and support teams, in a dark instrument-panel language, dial ENERGY 1 / RHYTHM 2 / MOTION 1."

Reasons:

- Dark chrome: the screenshot is the content, so dark UI keeps the captured image dominant and avoids glare during long annotation sessions. This reason is written down, so no light/dark toggle is shipped in this plan.
- RHYTHM 2: the popup is a short uniform list, the editor is a dense two-tier workbench with contextual tool groups.
- MOTION 1: transitions exist only as 0.15s state changes, with no entrance animation.

### Decisions to confirm

- [x] **Keep per-mode icon hues in the popup** (violet, emerald, amber, pink) as functional wayfinding, exposed as `--mode-*` tokens, while all chrome uses one accent. Recommended, because the hues map to capture modes and speed up scanning. The core palette stays slate plus one blue accent; mode hues are functional status colors, not decoration.
- [x] **Font route**: self-host Plus Jakarta Sans in `fonts/` and drop the Google Fonts `<link>`. This removes a third-party render-blocking request and makes the README's "100% local" claim true. If the font files cannot be fetched, fall back to the system stack through `--font-family`; nothing else in the plan depends on the font.

The mode hues remain tokenized as `--mode-*` and are used only on mode icons. The font is self-hosted at `fonts/PlusJakartaSans-Variable.woff2`, so no request leaves the extension.

## Why 5 days is not too much

Core work is about 3 focused days. Day 5 is the verification buffer: popup at 320px, editor at five breakpoints, keyboard-only pass, reduced motion, and the AFTER-mode audit. Five days keeps the migration honest instead of rushing a 2,000-line stylesheet.

## Day 1: Direction, tokens, base layer

- [x] Write the direction fields above into a short `Plan/design-direction.md` (identity, palette, type, dials, one-line reason per choice)
- [x] Create `styles/tokens.css` with semantic tokens only:
  - surfaces (`--surface-app`, `--surface-panel`, `--surface-raised`), borders, text (`--text-main`, `--text-muted`, `--text-faint` with a tested contrast ratio), accent, danger, success
  - `--mode-viewport`, `--mode-devtools`, `--mode-area`, `--mode-fullpage`, `--mode-delayed`
  - radius scale (4 / 6 / 8 / 12), space scale (4 / 8 / 12 / 16 / 24), type scale and weights
  - focus ring, elevation, motion (`--ease`, `--dur-fast: 150ms`)
  - layer order declared once: `@layer tokens, base, components;`
- [x] Create `styles/base.css`: reset, global `:focus-visible` ring, `cursor: pointer` for enabled controls and `cursor: not-allowed` for disabled controls, `prefers-reduced-motion` rule for all surfaces, scrollbar styling, base button and input typography
- [x] Link `tokens.css` and `base.css` from both HTML files before the surface stylesheet
- **Done when:** both surfaces render identically to today at their default sizes, with no JS changes. The HTML diff touches only `<link>` lines.

Status: code complete on 2026-11-23. Visual parity still needs a load-unpacked check in Chrome. The only rules that can shift rendering are the global scrollbar treatment on editor panels that were never scrollbar-styled, and the new keyboard focus ring where a surface rule did not already provide one.

## Day 2: Type and color correctness

- [x] Self-host Plus Jakarta Sans (400/500/600/700) in `fonts/`, add `@font-face` rules, remove the three Google Fonts links from `editor.html`
- [x] Point both surfaces at `--font-family`; the popup leaves its separate system stack
- [x] Replace popup hard-coded colors with tokens, keeping mode hues as `--mode-*`
- [x] Fix the contrast failures measured in `popup.css`: footer `#64748b` on `#0f172a` is about 3.7:1, which fails AA for 10.5px text, and `.shortcut-tag` is similar. Introduce `--text-faint` at a ratio of at least 4.5:1 and use it there
- [x] Delete the invalid `flex-direction: border-box;` declaration in `.popup-container`
- **Done when:** no hex values remain in `popup.css` outside the documented mode tokens, contrast ratios are recorded, and no request goes to fonts.googleapis.com.

Recorded results:

- Font: `fonts/PlusJakartaSans-Variable.woff2` (variable, weights 400 to 700), loaded through `@font-face` in `styles/base.css`.
- Network: only the local font file loads; no request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Footer: `--text-faint` `#8795ad` on `--surface-workspace` `#0f172a` is 5.89:1, AA pass for 10px text.
- Shortcut tag: `--text-faint` `#8795ad` on `--surface-raised` `#1e293b` is 4.83:1, AA pass for 10px text.
- `popup.css` contains no hex or rgba color literals, and the invalid `flex-direction: border-box` declaration is gone.

## Day 3: Shared components, part 1

- [x] `styles/components.css`: `.btn` base with `--primary`, `--secondary`, `--icon` and `--danger` modifiers, covering hover, active, disabled and focus-visible
- [x] Migrate editor `.btn-primary`, `.btn-secondary` and `.btn-icon` to compose `.btn`, using `:is()` selectors so the markup and class names stay as they are
- [x] Popup `.mode-card` keeps its layout but takes border, radius, surface, hover and focus from component tokens
- [x] `.chip` primitive for `.delay-chip`, `.token-chip` and `.shortcut-tag`, with size modifiers
- [x] `.badge` primitive for `.badge`, `.badge-dimension`, `.crop-badge`, `.opacity-badge` and `.intensity-badge`
- [x] `.kbd` primitive for `.kbd-hint` and `.kbd-mini`
- **Done when:** each primitive has one definition, all four interaction states are visible and consistent, and `popup.js` and `editor.js` are untouched.

Recorded results:

- `styles/components.css` is linked after `styles/base.css` and before `popup.css` and `editor.css`.
- Buttons share one base through `:is(.btn, .btn-primary, .btn-secondary, .btn-icon)`. Primary, secondary and icon modifiers cover hover, active, disabled and focus-visible.
- Mode card surface, hover, active and focus moved to the component layer; popup keeps layout and mode-specific icon colors.
- Chip, badge and kbd bases are defined once; surface stylesheets keep layout only.
- Removed the unlayered global reset from `editor.css` so the shared base reset and component layer can apply without stripping component padding.
- Verified computed styles: Save is 8px 12px padding with a 35px height; Copy is 8px 16px with a 35px height; icon buttons stay 30px square; chips keep their 4px radius; keyboard keys use the dark keycap tokens.
- Badge text uses `--text-main` for crop and value badges so small labels keep AA contrast on tinted surfaces.
- Verified states: mode card hover changes surface and border; delay chip hover uses the delayed-mode hue; token chip hover strengthens its blue surface; disabled icon button stays at 0.5 opacity with no hover change; focus ring is a 2px blue outline.
- Popup checked at 320px; editor checked at 600px and 400px with no page overflow.
- Coarse pointer controls keep a 44px minimum target, including icon-only Save and Copy.
- `popup.js` and `editor.js` were not edited.

## Day 4: Shared components, part 2, and states

- [x] Merge the two toggle implementations (`.toggle-slider`, `.beautify-switch-slider`) into one `.switch`
- [x] Merge the two segmented controls (`.mode-btn`, `.beautify-segment`) into one `.segmented`
- [x] Unify `.format-select`, `.template-input` and the range sliders under `.field` and `.slider`, built from tokens
- [x] Unify popover chrome (`.export-settings-panel`, `.watermark-panel`, `.tool-tooltip`) into `.panel`
- [x] Add the missing UI states in the base layer:
  - disabled controls share one style
  - pending button style for Save and Copy, so a second click is blocked and work is visible
  - editor image load error state that replaces the permanent "Loading..." badge text
- **Done when:** each merged primitive renders the same in both places, keyboard focus order is unchanged, and the pending and error states are reachable.

Recorded results (headless Chromium 1248 against `python3 -m http.server`):

- Switch: `.toggle-control`, `.beautify-switch` share one `.switch` base. Clicking the URL Bar label sets `checked`, track `rgb(59, 130, 246)`, thumb `translateX(12px)`, track 28x16 at `999px` radius. Hidden input stays keyboard-focusable with the 2px focus ring on the track.
- Segmented: `.beautify-segment` and `.redact-mode-toggle` both report 2px padding, 2px gap, 8px wrapper radius, 6px button radius. Active state uses `--accent-action-soft` `rgba(59, 130, 246, 0.14)` plus `--accent-action-border` `rgba(59, 130, 246, 0.32)`; inactive buttons stay transparent with `--text-muted`.
- Fields: `.format-select` keeps its inline SVG arrow through `background-image`, `background-position: calc(100% - 9px) 50%`, `no-repeat`, and 26px right padding; radius 8px. `.template-input` keeps the monospace stack and `user-select: text`. Both share `7px 10px` padding and the hover/focus-visible border.
- Sliders: all four inputs (`.quality-slider`, `#beautify-padding`, `#opacity-slider`, `#blur-intensity-slider`) resolve to the shared 18px host height, 5px track and 14px blue thumb; visible in the panel and rail captures.
- Panel: `.export-settings-panel` renders `--surface-popover` `#131a2a`, border `rgba(255, 255, 255, 0.18)`, `--radius-lg` 12px, `--shadow-panel` `0 18px 40px rgba(0, 0, 0, 0.55)`.
- Pending: forcing `.is-pending` + `disabled` on Copy yields opacity 0.75, `cursor: progress`, `aria-busy="true"`, then clears back. Removed the unlayered `.app-header button:disabled { cursor: not-allowed }` duplicate in `editor.css` that was silently overriding the pending cursor.
- Error: `.badge-dimension.is-error` renders `--danger-text` `rgb(252, 165, 165)` on `--danger-soft` `rgba(239, 68, 68, 0.18)` with `--danger-border` `rgba(239, 68, 68, 0.4)`; `editor.js` sets the text to "Image failed to load" only when `imageLoadError` is true.
- Popup at 320px: `scrollWidth` equals `clientWidth` (320), mode card radius 8px, delay chip radius 4px, so Day 4 did not regress the popup.
- Console: no application errors; the only logged error is the local server's `favicon.ico` 404.
- Still pending for Day 5: the load-unpacked Chrome pass, full keyboard order, and the audit file.

## Day 5: Verification and audit

- [ ] Load unpacked in Chrome and click through, recording each element:
  - popup: four mode buttons and three delay chips, plus the stored delay restored on reopen
  - editor: every tool button, color, stroke, sliders, export panel, watermark, beautify, copy and save
- [ ] Keyboard-only pass on both surfaces: Tab order, Enter and Space, Escape in panels, visible focus everywhere
- [ ] Check the popup at 320px and the editor at 1350, 1150, 950, 800, 700 and 480 breakpoints, plus `(pointer: coarse)`
- [ ] Check `prefers-reduced-motion: reduce`
- [ ] Update the README project structure with the `styles/` and `fonts/` folders
- [ ] Run the AFTER-mode audit on the changed UI and write `anti-slop/audit-001-YYYY-MM-DD.md`
- **Done when:** the delivery gate passes with recorded evidence, there are no console errors, and the audit findings are listed.

## Out of scope

- Light theme toggle (dark is documented as the product direction in this plan)
- The Base UI React library, React, or any bundler
- New capture or annotation features
- `background.js`, `content/` and `capture/` logic

## Risks and mitigations

| Risk | Mitigation |
| :--- | :--- |
| Visual drift during migration | Day 1 ends with identical rendering; migrate primitive by primitive, not in one sweep |
| The 2,000-line `editor.css` hiding edge cases | Keep class names and selectors; override at the token level first, then collapse duplicates |
| Font fetch blocked by network or license | Fall back to the system stack through `--font-family`; the plan does not depend on the font |
| Contrast edits causing new failures | Measure every changed text token and record the ratio |

## Plan checklist

- [ ] Tokens are the only source of color, radius, spacing, type and motion values
- [ ] Every interactive element has hover, active, disabled and focus-visible states from one place
- [ ] No class names changed, so `popup.js` and `editor.js` need no edits
- [ ] Delivery gate passes with recorded evidence
