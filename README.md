# Screen Snap & Rectangle Editor

A lightweight, productivity-focused Chrome extension for capturing and annotating screenshots. Capture either the current viewport or the full Chrome window (including docked DevTools / Inspect Element), highlight content with crisp rectangles, and instantly copy the final image to the clipboard. The editor tab closes automatically so you can paste directly into chats, emails, documents, or task managers without saving files locally.

---

## Key Features

- **Icon Popup Menu**: Quick access popup menu offering 3 capture modes:
  - **Normal Viewport**: Instant screenshot of active tab webpage area (`Alt+Shift+S`).
  - **Include DevTools**: Full Chrome window capture including inspect element / DevTools panel and browser bar (`Alt+Shift+W`).
  - **Select Area**: Drag a rectangle over the page to capture just that region (`Alt+Shift+R`).
- **Select-area Capture**: A dimmed overlay shows a frozen copy of the page; drag the region you want and the crop opens directly in the editor. Press `Esc` to cancel.
- **DevTools / Inspect Element Capture**: Captures the complete browser window with docked developer tools (Console, Network, Elements, etc.) without cropping.
- **Top URL & Timestamp Header**: Automatically appends a clean browser-style top banner containing the source page URL and capture timestamp (YYYY-MM-DD HH:MM:SS) for viewport captures. Includes an on/off toggle in the toolbar.
- **Annotation Tools (Select, Eraser, Rectangle, Ellipse, Line, Arrow, Step, Highlight, Blur, Text)**: 
  - **Select & Edit Tool (`V`)**: Click any existing annotation to select it, drag to move, drag 8-point handles to resize, nudge with Arrow keys, change colors/strokes live, or press `Delete` / `Backspace` to remove. Double-click text annotations to edit inline.
  - **Eraser Tool (`E`)**: Click any annotation or drag across multiple annotations to remove them instantly with red hover highlight preview, step renumbering, and full undo support.
  - **Rectangle Tool (`R`)**: Draw outline rectangles smoothly to highlight key areas, text, or elements. Hold `Shift` to constrain to a square.
  - **Ellipse Tool (`O`)**: Draw clean circular or oval highlights around UI controls. Hold `Shift` to constrain to a perfect circle.
  - **Line Tool (`L`)**: Draw straight rule lines to separate or underline content. Hold `Shift` to snap angle in 45° increments.
  - **Arrow Tool (`A`)**: Draw directional arrows with crisp chevrons to point directly to issues or buttons. Hold `Shift` to snap angle in 45° increments.
  - **Step Marker Tool (`N`)**: Place sequentially numbered circles (1, 2, 3...) to document workflows step-by-step. Features automatic incrementing, renumbering on undo, and maximum legibility across all stroke sizes.
  - **Highlighter Tool (`H`)**: Semi-transparent, wide-stroke marker with adjustable opacity (15%–85%). Hold `Shift` to snap to a straight horizontal line.
  - **Blur / Redact Tool (`B`)**: Redact sensitive data by dragging rectangular regions with Pixelate (block sampling) or smooth Gaussian Blur modes and a 5-level intensity slider. Hold `Shift` to constrain to a square.
  - **Text Tool (`T`)**: Click anywhere on the screenshot to type custom text annotations with auto-resizing, live colors, and clear drop-shadow legibility.
- **Curated Color Palette**: Pre-configured high-contrast colors (Crimson Red, Orange, Yellow, Green, Cyan, Blue, White) plus a native custom color picker.
- **Adjustable Stroke / Font Size**: Choose from 4 line weights & corresponding font sizes (Thin: 2px / 16px, Medium: 4px / 22px, Thick: 7px / 32px, Bold: 11px / 44px).
- **History & Undo/Redo**: Full undo (`Ctrl+Z`) and redo (`Ctrl+Y` / `Ctrl+Shift+Z`) support with state preservation when toggling the URL header.
- **One-Click Copy & Auto-Close**: Click **Copy to Clipboard** or press `Ctrl+C` / `Enter`. The PNG image is written directly to your system clipboard, and the tab closes automatically after confirmation.
- **100% Local & Privacy-Friendly**: Runs entirely in your browser without external servers, telemetry, or tracking.

---

## Installation (Load Unpacked)

This extension can be installed on any Chromium-based browser (Google Chrome, Microsoft Edge, Brave, Opera, etc.) on Windows, macOS, or Linux:

1. Clone or download this repository to your local machine:
   ```bash
   git clone https://github.com/rifkykurniawan/my-screenshot-app.git
   ```
2. Open Google Chrome and navigate to the extensions page:
   ```text
   chrome://extensions
   ```
3. In the top right corner, enable **Developer mode**.
4. In the top left corner, click **Load unpacked** (or click the refresh icon if you have already loaded it).
5. Select the project root folder (the folder containing `manifest.json`).
6. The extension is now installed and ready to use!
7. *(Recommended)*: Click the puzzle piece icon (Extensions) in the Chrome toolbar and pin 📌 the extension for quick access.

---

## How to Use

### Method 1: Using the Extension Icon Menu
1. Open any webpage or web application (and open DevTools with `F12` or `Ctrl+Shift+I` if desired).
2. Click the **Screen Snap** icon in your browser toolbar.
3. Select your desired capture mode:
   - **Normal Viewport**: Instantly captures the visible page area and opens the editor.
   - **Include DevTools**: A screen-picker prompt will appear. Under the **"Window"** tab, select your Chrome window and click **Share**.
   - **Select Area**: The page dims with a frozen preview; drag a rectangle around the part you want (press `Esc` to cancel).
4. Draw rectangles, ellipses, lines, arrows, highlights, or add text to point out details.
5. Click **"Copy to Clipboard"** (or press `Ctrl + C` / `Enter`).
6. Paste (`Ctrl + V` / `Cmd + V`) directly into Slack, Teams, Notion, Google Docs, GitHub, etc.

### Method 2: Using Keyboard Shortcuts
- Press `Alt + Shift + S` anytime for **Normal Viewport** capture.
- Press `Alt + Shift + W` anytime for **Include DevTools / Window** capture.
- Press `Alt + Shift + R` anytime for **Select Area** capture.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + Shift + S` *(Option+Shift+S on Mac)* | Capture active viewport & open editor |
| `Alt + Shift + R` *(Option+Shift+R on Mac)* | Select an area of the page & open editor |
| `Alt + Shift + W` *(Option+Shift+W on Mac)* | Capture window with DevTools & open editor |
| `V` | Select tool (Click annotation to select, drag to move, drag handles to resize) |
| `E` | Eraser tool (Click or drag across annotations to erase) |
| `R` | Select Rectangle tool |
| `O` | Select Ellipse tool |
| `L` | Select Line tool |
| `A` | Select Arrow tool |
| `N` | Select Step marker tool (Click to place numbered step: 1, 2, 3...) |
| `H` | Select Highlighter tool (Hold `Shift` to snap straight horizontal highlight) |
| `B` | Select Blur / Redact tool (Hold `Shift` to constrain to square region) |
| `T` | Select Text tool (Double-click existing text in Select mode to edit) |
| `Delete` or `Backspace` | Delete selected annotation |
| `Arrow Keys` *(+ Shift for 10px)* | Nudge selected annotation |
| `Enter` *(while typing text)* | Commit text annotation |
| `Shift + Enter` *(while typing text)* | Insert newline in text annotation |
| `Ctrl + C` or `Enter` *(Cmd+C on Mac)* | Copy screenshot to clipboard & auto-close tab |
| `Ctrl + Z` *(Cmd+Z on Mac)* | Undo last annotation |
| `Ctrl + Y` or `Ctrl + Shift + Z` | Redo annotation |
| `Escape` | Cancel current drawing drag, deselect annotation, or dismiss active text |

> **Note**: You can customize extension keyboard shortcuts anytime by visiting `chrome://extensions/shortcuts` in your browser.

---

## Project Structure

```text
my-screenshot-app/
├── manifest.json            # Chrome Manifest V3 configuration & permissions
├── background.js            # Service worker handling capture & tab orchestration
├── popup/                   # Extension toolbar menu popup
│   ├── popup.html           # Popup markup with 3 capture mode options
│   ├── popup.css            # Dark mode styling for popup menu
│   └── popup.js             # Mode selection event dispatcher
├── content/                 # Injected select-area overlay
│   └── area-select.js       # Drag-to-select region, crops the frozen capture
├── capture/                 # Window capture helper
│   ├── capture.html         # Capture helper page
│   └── capture.js           # getDisplayMedia frame grabber
├── icons/                   # Extension icons (16px, 48px, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── editor/                  # Annotation editor workspace
│   ├── editor.html          # Markup and toolbar controls
│   ├── editor.css           # Modern dark-mode styling
│   └── editor.js            # Canvas rendering, URL bar, shapes & clipboard logic
└── README.md                # Project documentation
```

---

## License

MIT License. Free to use, modify, and distribute for personal or team workflows.
