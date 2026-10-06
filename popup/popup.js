// Popup Menu Controller
document.addEventListener('DOMContentLoaded', async () => {
  const btnNormal = document.getElementById('btn-mode-normal');
  const btnDevTools = document.getElementById('btn-mode-devtools');
  const delaySelect = document.getElementById('delay-select');
  const countdownBanner = document.getElementById('countdown-banner');
  const countdownText = document.getElementById('countdown-text');

  // Load saved delay setting
  try {
    const data = await chrome.storage.local.get(['captureDelaySeconds']);
    if (data && typeof data.captureDelaySeconds !== 'undefined') {
      delaySelect.value = String(data.captureDelaySeconds);
    }
  } catch (err) {
    console.warn('Could not read saved capture delay:', err);
  }

  // Save delay on change
  delaySelect.addEventListener('change', () => {
    chrome.storage.local.set({ captureDelaySeconds: parseInt(delaySelect.value, 10) });
  });

  // Trigger Normal Viewport Capture
  btnNormal.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'capture-normal' });
    } catch (err) {
      console.error('Error triggering normal capture:', err);
    } finally {
      window.close();
    }
  });

  // Trigger DevTools / Window Capture
  btnDevTools.addEventListener('click', async () => {
    const delay = parseInt(delaySelect.value, 10) || 0;
    try {
      await chrome.runtime.sendMessage({
        action: 'capture-devtools',
        delaySeconds: delay
      });
    } catch (err) {
      console.error('Error triggering devtools capture:', err);
    } finally {
      window.close();
    }
  });
});
