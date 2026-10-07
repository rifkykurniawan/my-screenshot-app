// Popup Menu Controller
document.addEventListener('DOMContentLoaded', () => {
  const btnNormal = document.getElementById('btn-mode-normal');
  const btnDevTools = document.getElementById('btn-mode-devtools');

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
    try {
      await chrome.runtime.sendMessage({ action: 'capture-devtools' });
    } catch (err) {
      console.error('Error triggering devtools capture:', err);
    } finally {
      window.close();
    }
  });
});
