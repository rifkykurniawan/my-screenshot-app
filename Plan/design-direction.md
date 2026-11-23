# Screen Snap: Design Direction

Direction for the shared base UI layer. It is derived from the existing popup and editor, so the foundation formalizes what the product already looks like instead of introducing a new style.

## Design read

Reading this as: capture and annotation tool for developers, QA and support teams, in a dark instrument-panel language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## Identity

The screenshot is the content. The interface is the frame: dark neutrals, one action blue, and quiet surfaces that let the captured image dominate. Nothing in the chrome competes with the annotated screenshot.

## Dials

| Dial | Value | Reason |
| :--- | :--- | :--- |
| ENERGY | 1 | A utility extension used mid-task, not a landing page. It greets quietly. |
| RHYTHM | 2 | The popup is one uniform list; the editor is a dense two-tier workbench with contextual groups. |
| MOTION | 1 | Movement is state feedback only (hover, active, panel open), 150 to 300ms. No entrance animation. |

## Palette

| Token | Value | Role | Reason |
| :--- | :--- | :--- | :--- |
| `--slate-950` | `#090d16` | app background | Deepest surface, keeps the canvas the brightest object |
| `--slate-900` | `#0f172a` | workspace, popup background | One step up from the app shell |
| `--slate-800` | `#1e293b` | raised cards | Separates actionable rows from the background |
| `--blue-500` | `#3b82f6` | action accent | Existing editor accent; 4.8:1 on the workspace surface |
| `--sky-400` | `#38bdf8` | brand mark | Existing popup mark; identifies the product in the toolbar |
| `--emerald-500` | `#10b981` | success, area mode | Positive confirmation and the area capture hue |
| `--red-500` | `#ef4444` | danger | Destructive actions only |
| mode hues | violet, emerald, amber, pink | capture mode icons | Functional wayfinding: one hue per mode, no other meaning |

Core palette: slate neutrals, one action blue, one brand sky. Mode hues are status colors, not decoration; they appear only on mode icons and their hover states.

## Typography

| Field | Value | Reason |
| :--- | :--- | :--- |
| Family | Plus Jakarta Sans | Already used in the editor; geometric enough for small UI text, warmer than Inter |
| Fallback | system UI stack | Keeps the extension usable if the font file is unavailable |
| Sizes | 10, 11, 12, 13, 14, 16, 18, 22 | Matches the sizes already in use; no new step |
| Weights | 400, 500, 600, 700 | Four steps are enough for labels, values and titles |

The popup currently uses the system stack. Day 2 unifies it once the font route is confirmed.

## Shape, elevation, motion

| Field | Value | Reason |
| :--- | :--- | :--- |
| Radius | 4, 6, 8, 12, pill | Small chips and badges, controls, cards, panels; pill only for switches and status |
| Elevation 1 | `0 4px 14px rgba(37, 99, 235, 0.35)` | Primary action lift |
| Elevation 2 | `0 12px 30px rgba(0, 0, 0, 0.6)` | Floating canvas controls |
| Elevation 3 | `0 18px 40px rgba(0, 0, 0, 0.55)` | Popover panels |
| Tooltip | `0 8px 20px rgba(0, 0, 0, 0.45)` | Tooltips sit closest to the pointer |
| Duration | 150, 200, 300ms | Fast state change, base transition, panel and toast entrance |
| Easing | `ease-in-out`, `cubic-bezier(0.16, 1, 0.3, 1)` | Existing values; no new curve |

Elevation is used only to mark layers (floating controls, panels, tooltips), never on every card.

## Theme

Dark only. The editor surrounds a captured image, and a bright chrome would compete with it and glare during longer annotation sessions. This is the documented reason for shipping no light mode in this plan.

## Decisions

| Decision | Choice | Status |
| :--- | :--- | :--- |
| Mode icon hues | Keep, tokenized as `--mode-*` | Assumed for Day 1, confirm before Day 2 |
| Font | Self-host Plus Jakarta Sans | Planned for Day 2, falls back to system stack |

## Rules for new UI

- Every color, radius, spacing, type and motion value comes from a token; no raw hex in surface CSS.
- One accent per screen: action blue. Brand sky only on the product mark.
- Elevation marks a layer, not a decoration.
- No motion without a state change behind it.
