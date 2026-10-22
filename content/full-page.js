// Injected content script: captures a long page by scrolling through it,
// asking the service worker for one viewport slice at a time, then stitching
// the slices into a single tall image on a canvas.
(() => {
  const INDICATOR_ID = "__snap-fullpage-indicator";
  const STYLE_ID = "__snap-fullpage-style";
  const MAX_CANVAS_HEIGHT = 30000; // device px, safely below Chrome's canvas limits
  const MAX_CANVAS_PIXELS = 64000000; // keeps the stitched canvas within a safe memory budget
  const MAX_SLICES = 60;
  const SETTLE_MS = 220;

  // Only run in the top frame, and never twice
  if (window.top !== window) return;
  if (document.getElementById(INDICATOR_ID)) return;

  const state = {
    cancelled: false,
    indicator: null,
    indicatorText: null,
    styleEl: null,
    hidden: [],
    prevScrollX: 0,
    prevScrollY: 0,
    prevScrollBehavior: ""
  };

  run();

  async function run() {
    let meta = null;

    try {
      const stored = await chrome.storage.local.get(["pendingFullPage"]);
      meta = stored && stored.pendingFullPage;
      if (!meta) return;

      let dataUrl = null;
      try {
        dataUrl = await captureFullPage();
      } finally {
        restore();
      }

      if (state.cancelled || !dataUrl) {
        await chrome.storage.local.remove("pendingFullPage");
        await send("fullpage-cancelled");
        return;
      }

      await chrome.storage.local.set({
        latestScreenshot: dataUrl,
        sourceUrl: meta.sourceUrl || "",
        sourceTitle: meta.sourceTitle || "Screenshot",
        capturedAt: meta.capturedAt || Date.now(),
        captureMode: "fullpage"
      });
      await chrome.storage.local.remove("pendingFullPage");
      await send("fullpage-captured");
    } catch (err) {
      console.error("Full page capture failed:", err);
      try {
        await chrome.storage.local.remove("pendingFullPage");
      } catch (storageErr) {
        // Ignore
      }
      await send("fullpage-cancelled");
    }
  }

  async function captureFullPage() {
    createIndicator();
    window.addEventListener("keydown", onKeyDown, true);

    state.prevScrollX = window.scrollX;
    state.prevScrollY = window.scrollY;
    state.prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";

    hideScrollbars();
    // Force the reflow caused by hiding the scrollbar so the viewport
    // measurements match what captureVisibleTab will return
    void document.documentElement.offsetWidth;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    if (viewportW <= 0 || viewportH <= 0) {
      throw new Error("The page is not visible.");
    }

    window.scrollTo(0, 0);
    await settle();

    const firstImg = await loadImage(await captureSlice());
    const scale = firstImg.naturalHeight / viewportH;

    let targetH = 0;
    let canvas = null;
    let ctx = null;

    function ensureCanvas(cssHeight) {
      const pxHeight = Math.max(1, Math.round(cssHeight * scale));
      if (canvas && pxHeight <= canvas.height) return;

      const next = document.createElement("canvas");
      next.width = Math.max(1, Math.round(viewportW * scale));
      next.height = pxHeight;
      const nextCtx = next.getContext("2d");
      if (canvas) nextCtx.drawImage(canvas, 0, 0);
      canvas = next;
      ctx = nextCtx;
    }

    function drawSlice(img, offsetCss, srcTopCss, sliceCss) {
      const destTop = Math.round(offsetCss * scale);
      const destHeight = Math.round(Math.min(offsetCss + sliceCss, targetH) * scale) - destTop;
      const srcTop = Math.round(srcTopCss * scale);
      const srcHeight = Math.min(destHeight, img.naturalHeight - srcTop);
      if (srcHeight <= 0 || destHeight <= 0) return;

      ctx.drawImage(img, 0, srcTop, img.naturalWidth, srcHeight, 0, destTop, canvas.width, srcHeight);
    }

    const canvasWidth = Math.max(1, Math.round(viewportW * scale));
    const maxDeviceHeight = Math.min(MAX_CANVAS_HEIGHT, Math.floor(MAX_CANVAS_PIXELS / canvasWidth));
    const maxCssHeight = Math.max(viewportH, Math.floor(maxDeviceHeight / scale));
    targetH = Math.min(measurePageHeight(), maxCssHeight);

    ensureCanvas(targetH);
    drawSlice(firstImg, 0, 0, Math.min(viewportH, targetH));

    let offset = viewportH;
    let sliceCount = 1;
    let didScroll = false;

    // Fixed headers would otherwise repeat in every slice
    if (offset < targetH) hideFixedAndSticky();

    while (offset < targetH && sliceCount < MAX_SLICES && !state.cancelled) {
      // Lazy-loaded content can make the page taller as we scroll
      const liveHeight = Math.min(measurePageHeight(), maxCssHeight);
      if (liveHeight > targetH) {
        targetH = liveHeight;
        ensureCanvas(targetH);
      }

      const scrollY = Math.min(offset, Math.max(0, targetH - viewportH));
      window.scrollTo(0, scrollY);
      await settle();
      if (state.cancelled) break;

      const actualY = window.scrollY;
      if (actualY > 0) didScroll = true;
      const sliceCss = Math.min(viewportH, targetH - offset);
      if (sliceCss <= 0) break;

      updateIndicator(offset / targetH);
      const img = await loadImage(await captureSlice());
      drawSlice(img, offset, Math.max(0, offset - actualY), sliceCss);

      offset += viewportH;
      sliceCount += 1;
    }

    if (state.cancelled) return null;
    if (!didScroll && targetH > viewportH) {
      throw new Error("This page could not be scrolled; full-page capture is not supported here.");
    }
    if (sliceCount >= MAX_SLICES && offset < targetH) {
      console.warn("Full page capture stopped at the slice limit.");
    }

    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("Failed to render the stitched image.");
    }
    return dataUrl;
  }

  async function captureSlice() {
    setIndicatorVisible(false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    let response = null;
    try {
      response = await chrome.runtime.sendMessage({ action: "fullpage-slice" });
    } finally {
      setIndicatorVisible(true);
    }

    if (!response || !response.dataUrl) {
      throw new Error((response && response.error) || "Slice capture failed.");
    }
    return response.dataUrl;
  }

  async function settle() {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  }

  function createIndicator() {
    const host = document.createElement("div");
    host.id = INDICATOR_ID;
    host.style.cssText = [
      "all:initial",
      "position:fixed",
      "top:16px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:2147483647",
      "pointer-events:none"
    ].join(";");

    const root = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = "@keyframes snap-spin{to{transform:rotate(360deg)}}";

    const pill = document.createElement("div");
    pill.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:8px",
      "padding:8px 16px",
      "border-radius:999px",
      "background:rgba(15,23,42,0.94)",
      "border:1px solid rgba(56,189,248,0.45)",
      "color:#f8fafc",
      "font:500 12px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      "white-space:nowrap",
      "box-shadow:0 6px 20px rgba(0,0,0,0.35)"
    ].join(";");

    const spinner = document.createElement("span");
    spinner.style.cssText = [
      "width:10px",
      "height:10px",
      "border-radius:50%",
      "border:2px solid rgba(56,189,248,0.35)",
      "border-top-color:#38bdf8",
      "animation:snap-spin 0.8s linear infinite"
    ].join(";");

    state.indicatorText = document.createElement("span");
    state.indicatorText.textContent = "Capturing full page…  ·  Esc to cancel";

    pill.appendChild(spinner);
    pill.appendChild(state.indicatorText);
    root.appendChild(style);
    root.appendChild(pill);
    document.documentElement.appendChild(host);
    state.indicator = host;
  }

  function updateIndicator(fraction) {
    if (!state.indicatorText) return;
    const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
    state.indicatorText.textContent = "Capturing full page… " + pct + "%  ·  Esc to cancel";
  }

  function setIndicatorVisible(visible) {
    if (state.indicator) state.indicator.style.display = visible ? "" : "none";
  }

  function hideScrollbars() {
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = [
      "html{scrollbar-width:none !important;}",
      "html::-webkit-scrollbar,body::-webkit-scrollbar{width:0 !important;height:0 !important;display:none !important;}"
    ].join("");
    document.documentElement.appendChild(styleEl);
    state.styleEl = styleEl;
  }

  function hideFixedAndSticky() {
    if (!document.body) return;

    const hidden = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!(el instanceof Element) || el.id === INDICATOR_ID) continue;

      const position = getComputedStyle(el).position;
      if (position !== "fixed" && position !== "sticky") continue;
      if (el.getClientRects().length === 0) continue;

      hidden.push({
        el: el,
        value: el.style.getPropertyValue("visibility"),
        priority: el.style.getPropertyPriority("visibility")
      });
      el.style.setProperty("visibility", "hidden", "important");
    }
    state.hidden = hidden;
  }

  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    state.cancelled = true;
    if (state.indicatorText) state.indicatorText.textContent = "Cancelling…";
  }

  function restore() {
    window.removeEventListener("keydown", onKeyDown, true);

    if (state.indicator) {
      state.indicator.remove();
      state.indicator = null;
      state.indicatorText = null;
    }

    if (state.styleEl) {
      state.styleEl.remove();
      state.styleEl = null;
    }

    for (const item of state.hidden) {
      item.el.style.setProperty("visibility", item.value, item.priority);
    }
    state.hidden = [];

    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(state.prevScrollX, state.prevScrollY);
    document.documentElement.style.scrollBehavior = state.prevScrollBehavior;
  }

  function measurePageHeight() {
    const html = document.documentElement;
    const body = document.body;
    return Math.max(
      html.scrollHeight,
      html.offsetHeight,
      html.clientHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load a captured slice."));
      img.src = src;
    });
  }

  function send(action) {
    return chrome.runtime.sendMessage({ action: action }).catch(() => {});
  }
})();
