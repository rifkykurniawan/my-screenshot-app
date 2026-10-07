// Capture helper: Invokes getDisplayMedia to grab 1 frame of the selected window
(async () => {
  let stream = null;
  const stored = await chrome.storage.local.get(['pendingCaptureTarget']);
  const targetTab = stored.pendingCaptureTarget || {};

  try {
    const displayMediaOptions = {
      video: {
        displaySurface: 'window',
      },
      audio: false,
      selfBrowserSurface: 'include',
      systemAudio: 'exclude',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude'
    };

    stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
      throw new Error('No video track available from stream.');
    }

    // Wait a brief moment to allow prompt overlay to close and window to settle
    await new Promise((resolve) => setTimeout(resolve, 350));

    let dataUrl = null;

    // Method A: Try ImageCapture API if available
    if (typeof ImageCapture !== 'undefined') {
      try {
        const imageCapture = new ImageCapture(videoTrack);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        dataUrl = canvas.toDataURL('image/png');
      } catch (err) {
        console.warn('ImageCapture failed, falling back to video element:', err);
      }
    }

    // Method B: Fallback using HTMLVideoElement
    if (!dataUrl) {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(resolve);
        };
      });

      // Small delay to ensure frame is loaded in video buffer
      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      dataUrl = canvas.toDataURL('image/png');
    }

    // Stop all media tracks immediately
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (!dataUrl) {
      throw new Error('Failed to generate image from window stream.');
    }

    // Store in chrome.storage.local with captureMode: "window"
    await chrome.storage.local.set({
      latestScreenshot: dataUrl,
      sourceUrl: targetTab.url || '',
      sourceTitle: targetTab.title || 'Window with DevTools',
      capturedAt: Date.now(),
      captureMode: 'window'
    });

    // Open editor in a new tab inside user's main window
    const editorUrl = chrome.runtime.getURL('editor/editor.html');
    if (targetTab.originalWindowId) {
      await chrome.tabs.create({ windowId: targetTab.originalWindowId, url: editorUrl });
      await chrome.windows.update(targetTab.originalWindowId, { focused: true }).catch(() => {});
    } else {
      await chrome.tabs.create({ url: editorUrl });
    }

    // Close this separate popup window
    window.close();
  } catch (error) {
    console.warn('Window capture cancelled or failed:', error);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    // Close separate popup window on cancel or error
    window.close();
  }
})();
