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
    await abortPendingDelay();

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
    await abortPendingDelay();

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
    await abortPendingDelay();

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

// Full-page Capture
// Injects a content script that scrolls the page, asks the worker for viewport
// slices, and stitches them into a single tall image
async function startFullPageCapture() {
  try {
    await abortPendingDelay();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || typeof tab.id !== "number") {
      console.warn("No active tab found for full-page capture.");
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

    await chrome.storage.local.set({
      pendingFullPage: {
        sourceUrl: tab.url || "",
        sourceTitle: tab.title || "Screenshot",
        capturedAt: Date.now()
      }
    });

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/full-page.js"]
      });
    } catch (injectError) {
      console.error("Failed to inject full-page capturer:", injectError);
      await chrome.storage.local.remove("pendingFullPage");
    }
  } catch (error) {
    console.error("Error during full-page capture:", error);
  }
}

// Delayed Capture
// The injected content script runs the countdown on the page, then asks the
// worker for the capture so the countdown badge is never part of the image
const DELAY_OPTIONS = [3, 5, 10];

function setDelayBadge(text) {
  try {
    chrome.action.setBadgeBackgroundColor({ color: "#0ea5e9" });
    chrome.action.setBadgeText({ text: text || "" });
  } catch (error) {
    // The badge is decorative; never fail the capture because of it
  }
}

function clearDelayBadge() {
  setDelayBadge("");
}

// Starting another capture mode must not leave a countdown that fires later
async function abortPendingDelay() {
  clearDelayBadge();

  const stored = await chrome.storage.local.get("pendingDelay").catch(() => ({}));
  const pendingDelay = stored && stored.pendingDelay;
  if (!pendingDelay) return;

  await chrome.storage.local.remove("pendingDelay");

  if (typeof pendingDelay.tabId === "number") {
    try {
      await chrome.tabs.sendMessage(pendingDelay.tabId, { action: "delay-abort" });
    } catch (error) {
      // The tab may be gone or may not host the overlay; nothing to clean up
    }
  }
}

async function startDelayedCapture(seconds) {
  const requested = Number(seconds);
  const delaySeconds = DELAY_OPTIONS.includes(requested) ? requested : DELAY_OPTIONS[0];

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || typeof tab.id !== "number") {
      console.warn("No active tab found for delayed capture.");
      return;
    }

    if (!isCapturableUrl(tab.url)) {
      console.warn("Cannot capture restricted Chrome system page:", tab.url);
      return;
    }

    if (typeof tab.windowId === "number") {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
    }

    await chrome.storage.local.set({
      pendingDelay: {
        seconds: delaySeconds,
        tabId: tab.id,
        sourceUrl: tab.url || "",
        sourceTitle: tab.title || "Screenshot",
        startedAt: Date.now()
      }
    });

    setDelayBadge(String(delaySeconds));

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/delayed-capture.js"]
      });
    } catch (injectError) {
      console.error("Failed to inject delayed capture overlay:", injectError);
      await chrome.storage.local.remove("pendingDelay");
      clearDelayBadge();
    }
  } catch (error) {
    console.error("Error during delayed capture:", error);
  }
}

// Runs when the on-page countdown ends and the overlay has been removed
async function completeDelayedCapture(sender) {
  clearDelayBadge();

  const tab = sender && sender.tab;
  const stored = await chrome.storage.local.get("pendingDelay").catch(() => ({}));
  const pendingDelay = stored && stored.pendingDelay;

  await chrome.storage.local.remove("pendingDelay");

  // Cancelled or superseded by another capture mode
  if (!pendingDelay) return;

  if (!tab || typeof tab.id !== "number") {
    console.warn("No tab available for delayed capture.");
    return;
  }

  if (!isCapturableUrl(tab.url)) {
    console.warn("Cannot capture restricted Chrome system page:", tab.url);
    return;
  }

  // Never capture a page the user has navigated away from
  const [activeTab] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
  if (!activeTab || activeTab.id !== tab.id) {
    console.warn("Delayed capture aborted: the tab is no longer active.");
    return;
  }

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    if (!dataUrl) {
      console.error("Failed to capture visible tab after the delay.");
      return;
    }

    await chrome.storage.local.set({
      latestScreenshot: dataUrl,
      sourceUrl: tab.url || "",
      sourceTitle: tab.title || "Screenshot",
      capturedAt: Date.now(),
      captureMode: "delayed",
      captureDelaySeconds: pendingDelay.seconds || null
    });

    await openEditorForSender(sender);
  } catch (error) {
    console.error("Error during delayed capture:", error);
  }
}

// captureVisibleTab is throttled to roughly two calls per second
let lastSliceCapturedAt = 0;

async function captureSliceForSender(sender) {
  const tab = sender && sender.tab;
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No tab available for slice capture.");
  }

  // Never capture a page the user has navigated away from
  const [activeTab] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
  if (!activeTab || activeTab.id !== tab.id) {
    throw new Error("The captured tab is no longer active.");
  }

  const wait = lastSliceCapturedAt + 550 - Date.now();
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  let dataUrl;
  try {
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  } catch (firstError) {
    // Rate limits or transient failures are common; retry once
    await new Promise((resolve) => setTimeout(resolve, 600));
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  }

  lastSliceCapturedAt = Date.now();
  return dataUrl;
}

// Opens the editor after a content script finished preparing the capture
async function openEditorForSender(sender) {
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
  } else if (message && message.action === "capture-fullpage") {
    startFullPageCapture();
    sendResponse({ status: "started" });
  } else if (message && message.action === "capture-delayed") {
    startDelayedCapture(message.seconds);
    sendResponse({ status: "started" });
  } else if (message && message.action === "delay-tick") {
    // Ignore ticks from a countdown that another capture mode already aborted
    chrome.storage.local
      .get("pendingDelay")
      .then((data) => {
        if (!data || !data.pendingDelay) return;
        setDelayBadge(String(Math.max(0, Number(message.remaining) || 0)));
      })
      .catch(() => {});
    sendResponse({ status: "ok" });
  } else if (message && message.action === "delay-complete") {
    completeDelayedCapture(sender);
    sendResponse({ status: "capturing" });
  } else if (message && message.action === "delay-cancelled") {
    clearDelayBadge();
    chrome.storage.local.remove("pendingDelay");
    sendResponse({ status: "cancelled" });
  } else if (message && message.action === "fullpage-slice") {
    captureSliceForSender(sender)
      .then((dataUrl) => sendResponse({ dataUrl: dataUrl }))
      .catch((error) => sendResponse({ error: String((error && error.message) || error) }));
    return true;
  } else if (message && message.action === "area-captured") {
    openEditorForSender(sender);
    sendResponse({ status: "opening" });
  } else if (message && message.action === "fullpage-captured") {
    openEditorForSender(sender);
    sendResponse({ status: "opening" });
  } else if (message && message.action === "area-cancelled") {
    console.log("Area selection cancelled.");
    sendResponse({ status: "cancelled" });
  } else if (message && message.action === "fullpage-cancelled") {
    console.log("Full-page capture cancelled.");
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
  } else if (command === "take-fullpage-screenshot") {
    startFullPageCapture();
  }
});
