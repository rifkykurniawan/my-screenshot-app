// Background Service Worker for QA Screenshot Extension

async function captureAndOpenEditor() {
  try {
    // 1. Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.warn("No active tab found.");
      return;
    }

    // Check if URL is capturable
    if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("https://chromewebstore.google.com"))) {
      console.warn("Cannot capture restricted Chrome system page:", tab.url);
      return;
    }

    // 2. Capture the visible area (viewport) of the active tab in PNG format
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (!dataUrl) {
      console.error("Failed to capture visible tab.");
      return;
    }

    // 3. Store screenshot in chrome.storage.local for the editor tab to load
    await chrome.storage.local.set({
      latestScreenshot: dataUrl,
      sourceUrl: tab.url || "",
      sourceTitle: tab.title || "Screenshot",
      capturedAt: Date.now()
    });

    // 4. Open editor in a new tab
    const editorUrl = chrome.runtime.getURL("editor/editor.html");
    await chrome.tabs.create({ url: editorUrl });
  } catch (error) {
    console.error("Error during screenshot capture:", error);
  }
}

// Triggered when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  captureAndOpenEditor();
});

// Triggered via keyboard shortcut (default Alt+Shift+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") {
    captureAndOpenEditor();
  }
});
