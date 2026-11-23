# Base UI Foundation: 5-Day Plan

Status: planned, not started
Started:
Last updated: 2026-11-23

One shared base layer (tokens, base styles, shared components) for `popup/` and `editor/`, so both surfaces stop carrying duplicated colors, buttons, chips, toggles and focus rules. No feature changes, no JS rewrite.

Main files: `styles/tokens.css` (new), `styles/base.css` (new), `styles/components.css` (new), `popup/popup.html`, `popup/popup.css`, `editor/editor.html`, `editor/editor.css`, `README.md`.

## Progress

| Day | Focus | Status |
| :--- | :--- | :--- |
| 1 | Direction, tokens, base layer | Not started |
| 2 | Type and color correctness | Not started |
| 3 | Shared components, part 1 | Not started |
| 4 | Shared components, part 2, states | Not started |
| 5 | Verification and audit | Not started |

Update the Status cell to In progress or Done as you go. The checkboxes in each day are the detailed log.

## Direction (derived from current UI, confirm before Day 1)

Design read: "Reading this as: capture and annotation tool for developers and support teams, in a dark instrument-panel language, dial ENERGY 1 / RHYTHM 2 / MOTION 1."

Reasons:

- Dark chrome: the screenshot is the content, so dark UI keeps the captured image dominant and avoids glare during long annotation sessions. This reason is written down, so no light/dark toggle is shipped in this plan.
- RHYTHM 2: the popup is a short uniform list, the editor is a dense two-tier workbench with contextual tool groups.
- MOTION 1: transitions exist only as 0.15s state changes, with no entrance animation.

### Decisions to confirm

- [ ] **Keep per-mode icon hues in the popup** (violet, emerald, amber, pink) as functional wayfinding, exposed as `--mode-*` tokens, while all chrome uses one accent. Recommended, because the hues map to capture modes and speed up scanning. The core palette stays slate plus one blue accent; mode hues are functional status colors, not decoration.
- [ ] **Font route**: self-host Plus Jakarta Sans in `fonts/` and drop the Google Fonts `<link>`. This removes a third-party render-blocking request and makes the README's "100% local" claim true. If the font files cannot be fetched, fall back to the system stack through `--font-family`; nothing else in the plan depends on the font.

## Why 5 days is not too much

Core work is about 3 focused days. Day 5 is the verification buffer: popup at 320px, editor at five breakpoints, keyboard-only pass, reduced motion, and the AFTER-mode audit. Five days keeps the migration honest instead of rushing a 2,000-line stylesheet.

## Day 1: Direction, tokens, base layer

- [ ] Write the direction fields above into a short `Plan/design-direction.md` (identity, palette, type, dials, one-line reason per choice)
- [ ] Create `styles/tokens.css` with semantic tokens only:
  - surfaces (`--surface-app`, `--surface-panel`, `--surface-raised`), borders, text (`--text-main`, `--text-muted`, `--text-faint` with a tested contrast ratio), accent, danger, success
  - `--mode-viewport`, `--mode-devtools`, `--mode-area`, `--mode-fullpage`, `--mode-delayed`
  - radius scale (4 / 6 / 8 / 12), space scale (4 / 8 / 12 / 16 / 24), type scale and weights
  - focus ring, elevation, motion (`--ease`, `--dur-fast: 150ms`)
  - layer order declared once: `@layer tokens, base, components;`
- [ ] Create `styles/base.css`: reset, global `:focus-visible` ring, `cursor: pointer` for enabled controls and `cursor: not-allowed` for disabled controls, `prefers-reduced-motion` rule for all surfaces, scrollbar styling, base button and input typography
- [ ] Link `tokens.css` and `base.css` from both HTML files before the surface stylesheet
- **Done when:** both surfaces render identically to today at their default sizes, with no JS changes. The HTML diff touches only `<link>` lines.

## Day 2: Type and color correctness

- [ ] Self-host Plus Jakarta Sans (400/500/600/700) in `fonts/`, add `@font-face` rules, remove the three Google Fonts links from `editor.html`
- [ ] Point both surfaces at `--font-family`; the popup leaves its separate system stack
- [ ] Replace popup hard-coded colors with tokens, keeping mode hues as `--mode-*`
- [ ] Fix the contrast failures measured in `popup.css`: footer `#64748b` on `#0f172a` is about 3.7:1, which fails AA for 10.5px text, and `.shortcut-tag` is similar. Introduce `--text-faint` at a ratio of at least 4.5:1 and use it there
- [ ] Delete the invalid `flex-direction: border-box;` declaration in `.popup-container`
- **Done when:** no hex values remain in `popup.css` outside the documented mode tokens, contrast ratios are recorded, and no request goes to fonts.googleapis.com.

## Day 3: Shared components, part 1

- [ ] `styles/components.css`: `.btn` base with `--primary`, `--secondary`, `--icon` and `--danger` modifiers, covering hover, active, disabled and focus-visible
- [ ] Migrate editor `.btn-primary`, `.btn-secondary` and `.btn-icon` to compose `.btn`, using `:is()` selectors so the markup and class names stay as they are
- [ ] Popup `.mode-card` keeps its layout but takes border, radius, surface, hover and focus from component tokens
- [ ] `.chip` primitive for `.delay-chip`, `.token-chip` and `.shortcut-tag`, with size modifiers
- [ ] `.badge` primitive for `.badge`, `.badge-dimension`, `.crop-badge`, `.opacity-badge` and `.intensity-badge`
- [ ] `.kbd` primitive for `.kbd-hint` and `.kbd-mini`
- **Done when:** each primitive has one definition, all four interaction states are visible and consistent, and `popup.js` and `editor.js` are untouched.

## Day 4: Shared components, part 2, and states

- [ ] Merge the two toggle implementations (`.toggle-slider`, `.beautify-switch-slider`) into one `.switch`
- [ ] Merge the two segmented controls (`.mode-btn`, `.beautify-segment`) into one `.segmented`
- [ ] Unify `.format-select`, `.template-input` and the range sliders under `.field` and `.slider`, built from tokens
- [ ] Unify popover chrome (`.export-settings-panel`, `.watermark-panel`, `.tool-tooltip`) into `.panel`
- [ ] Add the missing UI states in the base layer:
  - disabled controls share one style
  - pending button style for Save and Copy, so a second click is blocked and work is visible
  - editor image load error state that replaces the permanent "Loading..." badge text
- **Done when:** each merged primitive renders the same in both places, keyboard focus order is unchanged, and the pending and error states are reachable.

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
