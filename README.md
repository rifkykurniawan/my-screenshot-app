# Screen Snap & Rectangle Editor

A lightweight, productivity-focused Chrome extension for capturing and annotating screenshots. Capture the current tab viewport with one click or keyboard shortcut, automatically prepend the page URL and timestamp, highlight content with crisp rectangles, and instantly copy the final image to the clipboard. The editor tab closes automatically so you can paste directly into chats, emails, documents, or task managers without saving files locally.

---

## Key Features

- **Instant Viewport Capture**: Takes a high-resolution screenshot of the active tab's visible area using `chrome.tabs.captureVisibleTab`.
- **Top URL & Timestamp Header**: Automatically appends a clean browser-style top banner containing the source page URL and capture timestamp (YYYY-MM-DD HH:MM:SS) without obscuring any webpage content or navigation bar. Includes an on/off toggle in the toolbar.
- **Content Highlighting (Rectangle Tool)**: Draw outline rectangles smoothly in any direction to highlight key areas, text, or elements.
- **Curated Color Palette**: Pre-configured high-contrast colors (Crimson Red, Orange, Yellow, Green, Cyan, Blue, White) plus a native custom color picker.
- **Adjustable Stroke Thickness**: Choose from 4 line weights (Thin: 2px, Medium: 4px, Thick: 7px, Bold: 11px).
- **History & Undo/Redo**: Full undo (`Ctrl+Z`) and redo (`Ctrl+Y` / `Ctrl+Shift+Z`) support with state preservation when toggling the URL header.
- **One-Click Copy & Auto-Close**: Click **Copy to Clipboard** or press `Ctrl+C` / `Enter`. The PNG image is written directly to your system clipboard, and the tab closes automatically after confirmation.
- **100% Local & Privacy-Friendly**: Runs entirely in your browser without external servers, telemetry, or tracking.

---

## Installation (Load Unpacked)

This extension can be installed on any Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, etc.) on Windows, macOS, or Linux:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/<your-username>/my-screenshot-app.git
   ```
2. Open Google Chrome and navigate to the extensions page:
   ```text
   chrome://extensions
   ```
3. In the top right corner, enable **Developer mode**.
4. In the top left corner, click **Load unpacked**.
5. Select the project root folder (the folder containing `manifest.json`).
6. The extension is now installed and ready to use!
7. *(Recommended)*: Click the puzzle piece icon (Extensions) in the Chrome toolbar and pin 📌 the extension for quick access.

---

## How to Use

1. Open any webpage or web application.
2. Click the extension icon in the toolbar, or press the shortcut:
   - **Windows / Linux**: `Alt + Shift + S`
   - **macOS**: `Option + Shift + S`
3. A new tab opens instantly with your captured screen and top URL header.
4. Click and drag your mouse across the image to draw rectangles and highlight key areas.
5. Click **"Copy to Clipboard"** (or press `Ctrl + C` / `Enter`).
6. A "Copied!" notification appears and the editor tab automatically closes.
7. Paste (`Ctrl + V` / `Cmd + V`) directly into your desired application (Slack, Teams, Notion, Google Docs, GitHub, etc.).

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + Shift + S` *(Option+Shift+S on Mac)* | Capture active tab & open editor |
| `Ctrl + C` or `Enter` *(Cmd+C on Mac)* | Copy screenshot to clipboard & auto-close tab |
| `Ctrl + Z` *(Cmd+Z on Mac)* | Undo last rectangle |
| `Ctrl + Y` or `Ctrl + Shift + Z` | Redo rectangle |
| `Escape` | Cancel current drag rectangle |

> **Note**: You can customize extension keyboard shortcuts anytime by visiting `chrome://extensions/shortcuts` in your browser.

---

## Project Structure

```text
my-screenshot-app/
├── manifest.json            # Chrome Manifest V3 configuration & permissions
├── background.js            # Service worker handling capture & tab orchestration
├── icons/                   # Extension icons (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── editor/                  # Annotation editor workspace
│   ├── editor.html          # Markup and toolbar controls
│   ├── editor.css           # Modern dark-mode styling
│   └── editor.js            # Canvas rendering, URL bar, shapes & clipboard logic
├── PLAN.md                  # Project architecture and development plan
└── README.md                # Project documentation
```

---

## License

MIT License. Free to use, modify, and distribute for personal or team workflows.
