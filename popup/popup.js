// Popup Menu Controller
document.addEventListener('DOMContentLoaded', () => {
  const btnNormal = document.getElementById('btn-mode-normal');
  const btnDevTools = document.getElementById('btn-mode-devtools');
  const btnArea = document.getElementById('btn-mode-area');
  const btnFullPage = document.getElementById('btn-mode-fullpage');
  const delayChips = Array.from(document.querySelectorAll('.delay-chip'));

  const DELAY_OPTIONS = [3, 5, 10];
  let selectedDelay = DELAY_OPTIONS[0];

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

  function markSelectedDelay() {
    delayChips.forEach((chip) => {
      chip.classList.toggle('selected', Number(chip.dataset.delay) === selectedDelay);
    });
  }

  // Trigger Delayed Capture with the chosen timer
  delayChips.forEach((chip) => {
    chip.addEventListener('click', async () => {
      selectedDelay = Number(chip.dataset.delay);
      markSelectedDelay();

      try {
        await chrome.storage.local.set({ captureDelay: selectedDelay });
      } catch (err) {
        console.error('Error saving delayed capture setting:', err);
      }

      try {
        await chrome.runtime.sendMessage({ action: 'capture-delayed', seconds: selectedDelay });
      } catch (err) {
        console.error('Error triggering delayed capture:', err);
      } finally {
        window.close();
      }
    });
  });

  // Remember the last used delay so the popup reopens on the same choice
  chrome.storage.local
    .get(['captureDelay'])
    .then((data) => {
      const stored = Number(data && data.captureDelay);
      if (DELAY_OPTIONS.includes(stored)) selectedDelay = stored;
      markSelectedDelay();
    })
    .catch(() => markSelectedDelay());
});
