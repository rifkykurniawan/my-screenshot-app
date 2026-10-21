// Injected content script: lets the user drag a region over a frozen capture,
// then crops that region and hands the result to the editor.
(() => {
  const OVERLAY_ID = "__snap-area-overlay";
  const MIN_SIZE = 5;

  // Only run in the top frame, and never twice
  if (window.top !== window) return;
  if (document.getElementById(OVERLAY_ID)) return;

  let pendingArea = null;

  // Viewport size recorded before scrollbars are hidden, so cropping stays aligned
  let viewW = 0;
  let viewH = 0;

  let host = null;
  let rectEl = null;
  let badgeEl = null;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let prevDocOverflow = "";
  let prevBodyOverflow = "";

  chrome.storage.local
    .get(["pendingArea"])
    .then((data) => {
      if (!data || !data.pendingArea || !data.pendingArea.dataUrl) return;
      pendingArea = data.pendingArea;
      start();
    })
    .catch((err) => console.error("Area select: failed to read pending capture:", err));

  function start() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    prevDocOverflow = document.documentElement.style.overflow;
    prevBodyOverflow = document.body ? document.body.style.overflow : "";
    document.documentElement.style.overflow = "hidden";
    if (document.body) document.body.style.overflow = "hidden";

    host = document.createElement("div");
    host.id = OVERLAY_ID;
    host.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "cursor:crosshair",
      "user-select:none",
      "-webkit-user-select:none",
      "touch-action:none",
      "background:transparent"
    ].join(";");

    // Frozen screenshot of the viewport
    const backdrop = document.createElement("img");
    backdrop.src = pendingArea.dataUrl;
    backdrop.alt = "";
    backdrop.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "width:100%",
      "height:100%",
      "object-fit:fill",
      "pointer-events:none",
      "user-select:none"
    ].join(";");

    // Full dim layer, hidden as soon as a drag starts (the rect dims instead)
    const mask = document.createElement("div");
    mask.id = "snap-area-mask";
    mask.style.cssText = [
      "position:absolute",
      "inset:0",
      "background:rgba(15,23,42,0.45)",
      "pointer-events:none"
    ].join(";");

    rectEl = document.createElement("div");
    rectEl.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "width:0",
      "height:0",
      "display:none",
      "border:1px solid #38bdf8",
      "box-shadow:0 0 0 100vmax rgba(15,23,42,0.45)",
      "pointer-events:none",
      "box-sizing:border-box"
    ].join(";");

    badgeEl = document.createElement("div");
    badgeEl.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "display:none",
      "padding:2px 6px",
      "border-radius:4px",
      "background:rgba(15,23,42,0.92)",
      "border:1px solid rgba(56,189,248,0.4)",
      "color:#38bdf8",
      "font:600 11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
      "white-space:nowrap",
      "pointer-events:none"
    ].join(";");

    const hint = document.createElement("div");
    hint.textContent = "Drag to select an area  ·  Esc to cancel";
    hint.style.cssText = [
      "position:absolute",
      "top:16px",
      "left:50%",
      "transform:translateX(-50%)",
      "padding:6px 14px",
      "border-radius:999px",
      "background:rgba(15,23,42,0.92)",
      "border:1px solid rgba(56,189,248,0.35)",
      "color:#f8fafc",
      "font:500 12px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      "pointer-events:none",
      "white-space:nowrap"
    ].join(";");

    host.appendChild(backdrop);
    host.appendChild(mask);
    host.appendChild(rectEl);
    host.appendChild(badgeEl);
    host.appendChild(hint);
    document.documentElement.appendChild(host);

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", cancel);
    host.addEventListener("contextmenu", blockEvent);
    host.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", cancel);
  }

  function blockEvent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    blockEvent(e);

    isDragging = true;
    startX = clamp(e.clientX, 0, viewW);
    startY = clamp(e.clientY, 0, viewH);

    const mask = host && host.querySelector("#snap-area-mask");
    if (mask) mask.style.display = "none";
    if (rectEl) rectEl.style.display = "block";
    if (badgeEl) badgeEl.style.display = "block";

    try {
      host.setPointerCapture(e.pointerId);
    } catch (err) {
      // Pointer capture is best-effort
    }

    setVisual(startX, startY, 0, 0);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    blockEvent(e);

    const currentX = clamp(e.clientX, 0, viewW);
    const currentY = clamp(e.clientY, 0, viewH);
    const box = normalize(startX, startY, currentX, currentY);
    setVisual(box.x, box.y, box.w, box.h);
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;

    try {
      host.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }

    const currentX = clamp(e.clientX, 0, viewW);
    const currentY = clamp(e.clientY, 0, viewH);
    const box = normalize(startX, startY, currentX, currentY);

    if (box.w < MIN_SIZE || box.h < MIN_SIZE) {
      resetBox();
      return;
    }

    finalize(box);
  }

  function resetBox() {
    if (rectEl) rectEl.style.display = "none";
    if (badgeEl) badgeEl.style.display = "none";
    const mask = host && host.querySelector("#snap-area-mask");
    if (mask) mask.style.display = "block";
  }

  function setVisual(x, y, w, h) {
    if (!rectEl || !badgeEl) return;

    rectEl.style.left = x + "px";
    rectEl.style.top = y + "px";
    rectEl.style.width = w + "px";
    rectEl.style.height = h + "px";

    badgeEl.textContent = Math.round(w) + " × " + Math.round(h);

    // Keep the badge on screen, preferring just above the selection
    let bx = x;
    let by = y - 24;
    if (by < 4) by = y + h + 6;
    if (by + 20 > viewH) by = Math.max(4, y + 4);
    if (bx + 70 > viewW) bx = Math.max(4, viewW - 72);

    badgeEl.style.left = bx + "px";
    badgeEl.style.top = by + "px";
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      blockEvent(e);
      cancel();
    }
  }

  async function cancel() {
    cleanup();
    try {
      await chrome.storage.local.remove("pendingArea");
    } catch (err) {
      // Ignore storage cleanup failures
    }
    try {
      await chrome.runtime.sendMessage({ action: "area-cancelled" });
    } catch (err) {
      // Service worker may be asleep; nothing to do
    }
  }

  async function finalize(box) {
    const source = pendingArea;

    cleanup();

    try {
      const img = await loadImage(source.dataUrl);
      const ratioX = img.naturalWidth / viewW;
      const ratioY = img.naturalHeight / viewH;

      const sx = Math.round(box.x * ratioX);
      const sy = Math.round(box.y * ratioY);
      const sw = Math.max(1, Math.round(box.w * ratioX));
      const sh = Math.max(1, Math.round(box.h * ratioY));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const cctx = canvas.getContext("2d");
      cctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const croppedUrl = canvas.toDataURL("image/png");

      await chrome.storage.local.set({
        latestScreenshot: croppedUrl,
        sourceUrl: source.sourceUrl || "",
        sourceTitle: source.sourceTitle || "Screenshot",
        capturedAt: source.capturedAt || Date.now(),
        captureMode: "area"
      });
      await chrome.storage.local.remove("pendingArea");

      await chrome.runtime.sendMessage({ action: "area-captured" });
    } catch (err) {
      console.error("Area select: failed to crop selection:", err);
      try {
        await chrome.storage.local.remove("pendingArea");
      } catch (storageErr) {
        // Ignore
      }
    }
  }

  function cleanup() {
    isDragging = false;

    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", cancel);

    if (host) {
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", cancel);
      host.removeEventListener("contextmenu", blockEvent);
      host.removeEventListener("wheel", blockEvent);
      host.remove();
      host = null;
    }

    rectEl = null;
    badgeEl = null;

    document.documentElement.style.overflow = prevDocOverflow;
    if (document.body) document.body.style.overflow = prevBodyOverflow;
  }

  function normalize(x1, y1, x2, y2) {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1)
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load captured image."));
      img.src = src;
    });
  }
})();
