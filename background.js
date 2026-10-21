// Background Service Worker for Screen Snap Extension

// Chrome blocks tab capture / script injection on these pages
function isCapturableUrl(url) {
  if (!url) return true;
  return !(
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("https://chromewebstore.google.com") ||
    url.startsWith("https://chrome.google.com/webstore")
  );
}

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
    if (!isCapturableUrl(tab.url)) {
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

// Select-area Capture
// 1. Grab the visible viewport first, so the overlay can show a frozen image
// 2. Inject the selection overlay; it crops the frozen image and stores the result
async function startAreaCapture() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || typeof tab.id !== "number") {
      console.warn("No active tab found for select-area capture.");
      return;
    }

    if (!isCapturableUrl(tab.url)) {
      console.warn("Cannot capture restricted Chrome system page:", tab.url);
      return;
    }

    // Make sure the target window is in front before grabbing pixels
    if (typeof tab.windowId === "number") {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (!dataUrl) {
      console.error("Failed to capture visible tab for area selection.");
      return;
    }

    await chrome.storage.local.set({
      pendingArea: {
        dataUrl: dataUrl,
        sourceUrl: tab.url || "",
        sourceTitle: tab.title || "Screenshot",
        capturedAt: Date.now()
      }
    });

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/area-select.js"]
      });
    } catch (injectError) {
      console.error("Failed to inject area selector:", injectError);
      await chrome.storage.local.remove("pendingArea");
    }
  } catch (error) {
    console.error("Error during select-area capture:", error);
  }
}

// Opens the editor after the content script cropped the selected region
async function openEditorFromArea(sender) {
  const editorUrl = chrome.runtime.getURL("editor/editor.html");
  const windowId = sender && sender.tab ? sender.tab.windowId : null;

  try {
    if (typeof windowId === "number") {
      await chrome.tabs.create({ windowId: windowId, url: editorUrl });
      await chrome.windows.update(windowId, { focused: true }).catch(() => {});
    } else {
      await chrome.tabs.create({ url: editorUrl });
    }
  } catch (error) {
    console.error("Error opening editor after area capture:", error);
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
  } else if (message && message.action === "capture-area") {
    startAreaCapture();
    sendResponse({ status: "started" });
  } else if (message && message.action === "area-captured") {
    openEditorFromArea(sender);
    sendResponse({ status: "opening" });
  } else if (message && message.action === "area-cancelled") {
    console.log("Area selection cancelled.");
    sendResponse({ status: "cancelled" });
  }
  return true;
});

// Triggered via keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") {
    captureNormalViewport();
  } else if (command === "take-window-screenshot") {
    captureWindowWithDevTools();
  } else if (command === "take-area-screenshot") {
    startAreaCapture();
  }
});
