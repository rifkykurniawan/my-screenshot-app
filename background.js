// Background Service Worker for Screen Snap Extension

// Normal Viewport Capture
async function captureNormalViewport() {
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

    // 2. Capture visible viewport in PNG
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (!dataUrl) {
      console.error("Failed to capture visible tab.");
      return;
    }

    // 3. Store screenshot in chrome.storage.local
    await chrome.storage.local.set({
      latestScreenshot: dataUrl,
      sourceUrl: tab.url || "",
      sourceTitle: tab.title || "Screenshot",
      capturedAt: Date.now(),
      captureMode: "normal"
    });

    // 4. Open editor in a new tab
    const editorUrl = chrome.runtime.getURL("editor/editor.html");
    await chrome.tabs.create({ url: editorUrl });
  } catch (error) {
    console.error("Error during normal viewport capture:", error);
  }
}

// Window Capture (Includes DevTools)
// Opens helper as a minimized/unfocused popup window, keeps user on their working tab
async function captureWindowWithDevTools(delaySeconds = 2) {
  try {
    // 1. Identify the current active tab and window
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const originalTabId = activeTab ? activeTab.id : null;
    const originalWindowId = activeTab ? activeTab.windowId : null;

    if (activeTab) {
      await chrome.storage.local.set({
        pendingCaptureTarget: {
          url: activeTab.url || "",
          title: activeTab.title || "Window with DevTools",
          originalTabId: originalTabId,
          originalWindowId: originalWindowId
        }
      });
    }

    // 2. Open capture helper page as a popup window off to the side, without stealing focus
    const captureUrl = chrome.runtime.getURL(`capture/capture.html?delay=${delaySeconds}`);
    const popupWindow = await chrome.windows.create({
      url: captureUrl,
      type: "popup",
      focused: false,
      width: 420,
      height: 380,
      left: 100,
      top: 100
    });

    // 3. Ensure the original tab and window stay focused so user is looking at their page
    if (originalWindowId) {
      try {
        await chrome.windows.update(originalWindowId, { focused: true });
      } catch (e) {
        // ignore window focus error
      }
    }
    if (originalTabId) {
      try {
        await chrome.tabs.update(originalTabId, { active: true });
      } catch (e) {
        // ignore tab focus error
      }
    }
  } catch (error) {
    console.error("Error launching window capture helper:", error);
  }
}

// Handle messages sent from popup menu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === "capture-normal") {
    captureNormalViewport();
    sendResponse({ status: "started" });
  } else if (message && message.action === "capture-devtools") {
    const delay = typeof message.delaySeconds !== "undefined" ? message.delaySeconds : 2;
    captureWindowWithDevTools(delay);
    sendResponse({ status: "started" });
  }
  return true;
});

// Triggered via keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "take-screenshot") {
    captureNormalViewport();
  } else if (command === "take-window-screenshot") {
    const stored = await chrome.storage.local.get(["captureDelaySeconds"]);
    const delay = typeof stored.captureDelaySeconds !== "undefined" ? stored.captureDelaySeconds : 2;
    captureWindowWithDevTools(delay);
  }
});
