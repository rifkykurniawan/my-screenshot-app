// Popup Menu Controller
document.addEventListener('DOMContentLoaded', () => {
  const btnNormal = document.getElementById('btn-mode-normal');
  const btnDevTools = document.getElementById('btn-mode-devtools');
  const btnArea = document.getElementById('btn-mode-area');
  const btnFullPage = document.getElementById('btn-mode-fullpage');

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

  // Trigger Select-area Capture
  btnArea.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'capture-area' });
    } catch (err) {
      console.error('Error triggering area capture:', err);
    } finally {
      window.close();
    }
  });

  // Trigger Full-page Capture
  btnFullPage.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'capture-fullpage' });
    } catch (err) {
      console.error('Error triggering full-page capture:', err);
    } finally {
      window.close();
    }
  });
});
