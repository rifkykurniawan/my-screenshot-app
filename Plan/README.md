# Screen Snap: 29-Day Feature Plan

Plan for building new features on top of Screen Snap (Chrome MV3 extension).

- **Period:** Tue 2026-10-13 to Tue 2026-11-10 (29 calendar days)
- **Schedule:** one rest/catch-up day per cycle. Work ran a day ahead from Day 10,
  so after Sun Oct 18 the rest days are Sat Oct 24, Sat Oct 31 and Sat Nov 7.
- **Working days:** 24, of which Day 9 (paste / drop image) was skipped and is still unimplemented.

> Timeline note: Day 12 (delayed capture) shipped on Fri Oct 23 instead of Sat Oct 24,
> and Day 11 shipped Thu Oct 22, so every date from Day 10 onward moved one day earlier.
> Day 17 (copy as Markdown / base64) was dropped, so later days were renumbered 17-29.

## Files
| File | Days | Theme |
| :--- | :--- | :--- |
| [00-roadmap-overview.md](00-roadmap-overview.md) | 1-29 | Calendar and milestones |
| [week-1-annotation-tools.md](week-1-annotation-tools.md) | 1-7 | New drawing tools |
| [week-2-capture-modes.md](week-2-capture-modes.md) | 8-14 | New ways to capture |
| [week-3-export-sharing.md](week-3-export-sharing.md) | 15-20 | Save, export, share |
| [week-4-advanced-editing.md](week-4-advanced-editing.md) | 21-27 | Beautify and edit |
| [week-5-productivity-release.md](week-5-productivity-release.md) | 28-29 | Settings and v2.0 release |
| [progress-tracker.md](progress-tracker.md) | 1-29 | Checklist |

## Already Available (not in scope)
Viewport and window capture, rectangle/arrow/text, colors, stroke sizes,
undo/redo, URL + timestamp header, copy to clipboard.

## Daily Format
Each day lists a goal, tasks, files touched and done criteria.

## Ground Rules
- Keep the extension 100% local (no telemetry).
- Add new permissions only when a feature needs them, and note it in the README.
- Update the README shortcut table whenever a shortcut is added.
- Test every feature in Chrome after load-unpacked reload.
