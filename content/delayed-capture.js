// Injected content script: shows a countdown badge on the page and asks the
// worker to grab the viewport once the delay has elapsed. The badge is removed
// before the capture request so it never ends up in the screenshot.
(() => {
  const HOST_ID = "__snap-delay-overlay";

  // Only run in the top frame
  if (window.top !== window) return;

  // A second delayed capture restarts the countdown instead of stacking overlays
  if (typeof window.__snapDelayCancel === "function") {
    try {
      window.__snapDelayCancel(false);
    } catch (err) {
      // Ignore stale overlay cleanup failures
    }
  }

  let host = null;
  let ringEl = null;
  let numberEl = null;
  let timerId = null;
  let seconds = 3;
  let startedAt = 0;
  let lastShown = -1;

  chrome.storage.local
    .get(["pendingDelay"])
    .then((data) => {
      if (!data || !data.pendingDelay) return;
      seconds = Math.min(60, Math.max(1, Number(data.pendingDelay.seconds) || 3));
      start();
    })
    .catch((err) => console.error("Delayed capture: failed to read delay:", err));

  function start() {
    startedAt = Date.now();
    lastShown = -1;

    // A previous overlay can survive a failed cleanup; never keep two
    const stale = document.getElementById(HOST_ID);
    if (stale) stale.remove();

    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = [
      "position:fixed",
      "top:16px",
      "left:50%",
      "transform:translateX(-50%)",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "pointer-events:none"
    ].join(";");

    const badge = document.createElement("div");
    badge.title = "Cancel delayed capture";
    badge.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:10px",
      "padding:7px 14px 7px 8px",
      "border-radius:999px",
      "background:rgba(15,23,42,0.94)",
      "border:1px solid rgba(56,189,248,0.45)",
      "box-shadow:0 8px 24px rgba(2,6,23,0.45)",
      "font:500 11px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      "color:#e2e8f0",
      "cursor:pointer",
      "pointer-events:auto",
      "user-select:none",
      "-webkit-user-select:none",
      "white-space:nowrap"
    ].join(";");

    ringEl = document.createElement("div");
    ringEl.style.cssText = [
      "position:relative",
      "width:30px",
      "height:30px",
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:conic-gradient(#38bdf8 0%, rgba(255,255,255,0.12) 0)"
    ].join(";");

    const inner = document.createElement("div");
    inner.style.cssText = [
      "width:22px",
      "height:22px",
      "border-radius:50%",
      "background:#0f172a",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "color:#38bdf8",
      "font:700 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
    ].join(";");

    numberEl = document.createElement("span");
    numberEl.textContent = String(seconds);
    inner.appendChild(numberEl);
    ringEl.appendChild(inner);

    const label = document.createElement("div");
    label.textContent = "Screen Snap · click to cancel";

    badge.appendChild(ringEl);
    badge.appendChild(label);
    badge.addEventListener("click", () => cancel(true));

    host.appendChild(badge);
    (document.body || document.documentElement).appendChild(host);

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pagehide", onPageHide, { once: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    chrome.runtime.onMessage.addListener(onRuntimeMessage);

    timerId = setInterval(tick, 100);

    window.__snapDelayCancel = cancel;
  }

  function tick() {
    const elapsed = Date.now() - startedAt;
    const total = seconds * 1000;
    const remainingMs = Math.max(0, total - elapsed);
    const remaining = Math.ceil(remainingMs / 1000);

    if (remaining !== lastShown) {
      lastShown = remaining;
      if (numberEl) numberEl.textContent = String(remaining);
      notify({ action: "delay-tick", remaining: remaining });
    }

    if (ringEl) {
      const pct = Math.min(100, (elapsed / total) * 100);
      ringEl.style.background =
        "conic-gradient(#38bdf8 " + pct + "%, rgba(255,255,255,0.12) 0)";
    }

    if (remainingMs <= 0) finish();
  }

  async function finish() {
    stop();
    window.__snapDelayCancel = null;

    // Let the browser repaint without the overlay before grabbing pixels
    await new Promise((resolve) => setTimeout(resolve, 120));

    notify({ action: "delay-complete" });
  }

  function cancel(notifyWorker) {
    stop();
    window.__snapDelayCancel = null;

    if (!notifyWorker) return;

    try {
      chrome.runtime.sendMessage({ action: "delay-cancelled" }).catch(() => {});
      chrome.storage.local.remove("pendingDelay").catch(() => {});
    } catch (err) {
      // Service worker may be asleep; nothing else to do
    }
  }

  function notify(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {});
    } catch (err) {
      // Service worker may be asleep; the next tick retries
    }
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }

    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    chrome.runtime.onMessage.removeListener(onRuntimeMessage);

    if (host) {
      host.remove();
      host = null;
    }

    ringEl = null;
    numberEl = null;
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel(true);
    }
  }

  function onPageHide() {
    cancel(true);
  }

  // Another capture mode was started while the countdown was running
  function onRuntimeMessage(message) {
    if (message && message.action === "delay-abort") cancel(false);
  }

  // Capturing a hidden tab would grab the wrong window, so stop the countdown
  function onVisibilityChange() {
    if (document.hidden) cancel(true);
  }
})();
