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
// Opens helper as a separate popup window so your main tab stays open and visible
async function captureWindowWithDevTools() {
  try {
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

    // Open helper in a separate popup window
    const captureUrl = chrome.runtime.getURL("capture/capture.html");
    await chrome.windows.create({
      url: captureUrl,
      type: "popup",
      focused: true,
      width: 480,
      height: 420,
      left: 150,
      top: 150
    });
  } catch (error) {
    console.error("Error launching window capture popup:", error);
  }
}

// Handle messages sent from popup menu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === "capture-normal") {
    captureNormalViewport();
    sendResponse({ status: "started" });
  } else if (message && message.action === "capture-devtools") {
    captureWindowWithDevTools();
    sendResponse({ status: "started" });
  }
  return true;
});

// Triggered via keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") {
    captureNormalViewport();
  } else if (command === "take-window-screenshot") {
    captureWindowWithDevTools();
  }
});
