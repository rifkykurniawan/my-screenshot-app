// Screen Snap Editor Logic with Top URL Bar
(() => {
  const canvas = document.getElementById('screenshot-canvas');
  const ctx = canvas.getContext('2d');
  const dimensionsBadge = document.getElementById('image-dimensions');
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  const toastDesc = document.getElementById('toast-desc');

  // Toolbar Elements
  const colorBtns = document.querySelectorAll('.color-btn');
  const customColorPicker = document.getElementById('custom-color-picker');
  const strokeBtns = document.querySelectorAll('.stroke-btn');
  const toggleUrlBar = document.getElementById('toggle-url-bar');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');

  // Drawing & State
  let currentColor = '#ef4444'; // Crimson Red default
  let currentStroke = 4;        // 4px default
  let showUrlBar = true;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;

  // Metadata
  let sourceUrl = '';
  let sourceTitle = 'Screenshot';
  let capturedAt = Date.now();
  let baseImage = null; // HTMLImageElement or Canvas fallback

  // Shape-based History (preserves quality and enables seamless URL bar toggling)
  const MAX_HISTORY = 40;
  let rectangles = []; // Array of { x, y, w, h, color, stroke } relative to image
  let undoStack = [[]]; // Stack of rectangles array snapshots
  let redoStack = [];

  // Live drag preview state
  let dragPreviewRect = null;

  // Initialize
  init();

  async function init() {
    setupEventListeners();
    await loadScreenshot();
  }

  // Load screenshot and metadata from chrome.storage.local
  async function loadScreenshot() {
    let screenshotDataUrl = null;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const data = await chrome.storage.local.get(['latestScreenshot', 'sourceUrl', 'sourceTitle', 'capturedAt', 'captureMode']);
        if (data && data.latestScreenshot) {
          screenshotDataUrl = data.latestScreenshot;
          sourceUrl = data.sourceUrl || '';
          sourceTitle = data.sourceTitle || 'Screenshot';
          capturedAt = data.capturedAt || Date.now();

          // If captured with window mode (which already includes browser URL & tabs & DevTools),
          // turn off the top URL banner by default to avoid redundancy
          if (data.captureMode === 'window') {
            showUrlBar = false;
            if (toggleUrlBar) {
              toggleUrlBar.checked = false;
            }
          }

          if (sourceTitle) {
            document.title = `Annotate: ${sourceTitle}`;
          }
        }
      } catch (err) {
        console.error('Failed to load screenshot from chrome.storage:', err);
      }
    }

    // Fallback placeholder if opened directly in browser without extension context
    if (!screenshotDataUrl) {
      sourceUrl = 'https://app.example.com/checkout/payment-summary';
      capturedAt = Date.now();
      createPlaceholderImage();
      return;
    }

    renderBaseImage(screenshotDataUrl);
  }

  function renderBaseImage(src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImage = img;
      render();
    };
    img.onerror = () => {
      console.error('Failed to load screenshot image.');
      createPlaceholderImage();
    };
    img.src = src;
  }

  function createPlaceholderImage() {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 1280;
    testCanvas.height = 720;
    const tctx = testCanvas.getContext('2d');

    // Background
    tctx.fillStyle = '#1e293b';
    tctx.fillRect(0, 0, testCanvas.width, testCanvas.height);

    // Grid lines for test canvas
    tctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    tctx.lineWidth = 1;
    for (let x = 0; x < testCanvas.width; x += 40) {
      tctx.beginPath();
      tctx.moveTo(x, 0);
      tctx.lineTo(x, testCanvas.height);
      tctx.stroke();
    }
    for (let y = 0; y < testCanvas.height; y += 40) {
      tctx.beginPath();
      tctx.moveTo(0, y);
      tctx.lineTo(testCanvas.width, y);
      tctx.stroke();
    }

    // Informational Text
    tctx.fillStyle = '#64748b';
    tctx.font = '600 24px system-ui, sans-serif';
    tctx.textAlign = 'center';
    tctx.fillText('Test Mode (Open via Extension Icon on any tab to capture)', testCanvas.width / 2, testCanvas.height / 2 - 20);

    tctx.font = '16px system-ui, sans-serif';
    tctx.fillStyle = '#94a3b8';
    tctx.fillText('Notice the URL bar above! Drag to draw rectangles, then Copy to Clipboard.', testCanvas.width / 2, testCanvas.height / 2 + 20);

    baseImage = testCanvas;
    render();
  }

  // Calculate banner height proportionally based on width
  function getBannerHeight() {
    if (!showUrlBar || !sourceUrl) return 0;
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
    return Math.max(40, Math.round(imgWidth * 0.025));
  }

  // Main Render Function: redraws banner, image, and all rectangles
  function render() {
    if (!baseImage) return;

    const imgWidth = baseImage.naturalWidth || baseImage.width;
    const imgHeight = baseImage.naturalHeight || baseImage.height;
    const bannerHeight = getBannerHeight();

    // Adjust canvas dimensions
    if (canvas.width !== imgWidth || canvas.height !== (imgHeight + bannerHeight)) {
      canvas.width = imgWidth;
      canvas.height = imgHeight + bannerHeight;
    }

    // 1. Draw URL Header Banner if enabled
    if (bannerHeight > 0) {
      drawUrlBanner(0, 0, imgWidth, bannerHeight);
    }

    // 2. Draw Screenshot Image below the banner
    ctx.drawImage(baseImage, 0, bannerHeight, imgWidth, imgHeight);

    // 3. Draw Committed Rectangles
    for (const r of rectangles) {
      drawRectangle(r.x, r.y + bannerHeight, r.w, r.h, r.color, r.stroke);
    }

    // 4. Draw Live Dragging Preview Rectangle
    if (dragPreviewRect) {
      drawRectangle(
        dragPreviewRect.x,
        dragPreviewRect.y + bannerHeight,
        dragPreviewRect.w,
        dragPreviewRect.h,
        dragPreviewRect.color,
        dragPreviewRect.stroke
      );
    }

    // Update Dimensions Badge
    dimensionsBadge.textContent = `${canvas.width} × ${canvas.height} px`;
  }

  // Draw URL Top Header Bar
  function drawUrlBanner(x, y, width, height) {
    ctx.save();

    // Background Bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, width, height);

    // Subtle bottom border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x, y + height - 1, width, 1);

    // Formatting date timestamp
    const dateObj = new Date(capturedAt);
    const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const timeStr = dateObj.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
    const formattedTimestamp = `${dateStr} ${timeStr}`;

    const fontSize = Math.max(13, Math.round(height * 0.35));
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;

    // Measure timestamp width
    const timeTextWidth = ctx.measureText(formattedTimestamp).width;
    const marginX = Math.round(height * 0.4);
    const timeRightX = width - marginX;

    // Draw Timestamp on the right
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(formattedTimestamp, timeRightX, y + height / 2);

    // Address Bar Pill Container
    const pillPaddingY = Math.max(4, Math.round(height * 0.15));
    const pillHeight = height - pillPaddingY * 2;
    const pillX = marginX;
    const pillRightMargin = timeRightX - timeTextWidth - Math.round(height * 0.6);
    const pillWidth = Math.max(120, pillRightMargin - pillX);

    // Pill background
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, pillX, y + pillPaddingY, pillWidth, pillHeight, Math.round(pillHeight * 0.25));
    ctx.fill();

    // Pill border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip text inside pill
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, pillX, y + pillPaddingY, pillWidth, pillHeight, Math.round(pillHeight * 0.25));
    ctx.clip();

    // Padlock / Link Icon inside pill
    const iconX = pillX + Math.round(pillHeight * 0.45);
    const iconCenterY = y + height / 2;
    const iconSize = Math.max(10, Math.round(fontSize * 0.85));

    drawLockIcon(ctx, iconX, iconCenterY, iconSize);

    // Draw URL Text
    const textStartX = iconX + iconSize + Math.round(fontSize * 0.6);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#38bdf8';
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;

    // Truncate if URL exceeds pill
    let displayText = sourceUrl;
    const maxUrlWidth = pillWidth - (textStartX - pillX) - 10;
    while (ctx.measureText(displayText).width > maxUrlWidth && displayText.length > 10) {
      displayText = displayText.slice(0, -4) + '...';
    }

    ctx.fillText(displayText, textStartX, y + height / 2);

    ctx.restore(); // restore clip
    ctx.restore(); // restore all
  }

  // Draw clean vector padlock icon
  function drawLockIcon(ctx, centerX, centerY, size) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, size / 8);

    const bodyW = size;
    const bodyH = size * 0.75;
    const bodyX = centerX - bodyW / 2;
    const bodyY = centerY - bodyH / 4;

    // Body
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, 2);
    ctx.fill();

    // Shackle
    ctx.beginPath();
    const shackleR = bodyW * 0.32;
    ctx.arc(centerX, bodyY, shackleR, Math.PI, 0, false);
    ctx.stroke();

    ctx.restore();
  }

  // Helper: Rounded Rectangle Path
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  }

  // Helper: Draw single rectangle
  function drawRectangle(x, y, w, h, color, stroke) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  // Coordinate helper: translates client mouse coordinates to canvas pixels
  function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  // Event Listeners
  function setupEventListeners() {
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Color buttons
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColor = btn.dataset.color;
      });
    });

    // Custom color picker
    customColorPicker.addEventListener('input', (e) => {
      colorBtns.forEach(b => b.classList.remove('active'));
      currentColor = e.target.value;
    });

    // Stroke buttons
    strokeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        strokeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStroke = parseInt(btn.dataset.stroke, 10);
      });
    });

    // Toggle URL Bar
    if (toggleUrlBar) {
      toggleUrlBar.addEventListener('change', (e) => {
        showUrlBar = e.target.checked;
        render();
      });
    }

    // Action buttons
    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);
    btnClear.addEventListener('click', clearAll);
    btnCopy.addEventListener('click', copyToClipboard);

    // Keyboard Shortcuts
    window.addEventListener('keydown', onKeyDown);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return; // Left mouse click only

    const coords = getCanvasCoordinates(e);
    const bannerHeight = getBannerHeight();

    startX = coords.x;
    // Map coordinate relative to screenshot image
    startY = coords.y - bannerHeight;
    isDrawing = true;
  }

  function onMouseMove(e) {
    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e);
    const bannerHeight = getBannerHeight();
    const currentX = coords.x;
    const currentY = coords.y - bannerHeight;

    const rx = Math.min(startX, currentX);
    const ry = Math.min(startY, currentY);
    const rw = Math.abs(currentX - startX);
    const rh = Math.abs(currentY - startY);

    if (rw === 0 || rh === 0) return;

    dragPreviewRect = {
      x: rx,
      y: ry,
      w: rw,
      h: rh,
      color: currentColor,
      stroke: currentStroke
    };

    render();
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    if (dragPreviewRect && dragPreviewRect.w > 3 && dragPreviewRect.h > 3) {
      rectangles.push({ ...dragPreviewRect });
      commitHistory();
    }

    dragPreviewRect = null;
    render();
  }

  // History Management
  function commitHistory() {
    undoStack.push([...rectangles]);
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = []; // Clear redo stack on new action
    updateHistoryButtons();
  }

  function undo() {
    if (undoStack.length <= 1) return;

    const current = undoStack.pop();
    redoStack.push(current);

    rectangles = [...undoStack[undoStack.length - 1]];
    render();
    updateHistoryButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;

    const next = redoStack.pop();
    undoStack.push(next);

    rectangles = [...next];
    render();
    updateHistoryButtons();
  }

  function clearAll() {
    if (rectangles.length === 0) return;

    rectangles = [];
    commitHistory();
    render();
  }

  function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length <= 1;
    btnRedo.disabled = redoStack.length === 0;
  }

  // Keyboard Shortcuts Handler
  function onKeyDown(e) {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // Ctrl+Z: Undo
    if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if ((isCtrlOrMeta && e.key.toLowerCase() === 'y') || (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl+C or Enter: Copy and Close
    if ((isCtrlOrMeta && e.key.toLowerCase() === 'c') || e.key === 'Enter') {
      e.preventDefault();
      copyToClipboard();
      return;
    }

    // Escape: Cancel current drawing drag
    if (e.key === 'Escape' && isDrawing) {
      isDrawing = false;
      dragPreviewRect = null;
      render();
    }
  }

  // Copy to Clipboard and Auto-Close
  async function copyToClipboard() {
    btnCopy.disabled = true;
    btnCopy.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Copying...</span>
    `;

    try {
      // Convert canvas to PNG Blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create canvas blob.'));
        }, 'image/png');
      });

      // Write PNG Blob to Clipboard
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);

      // Success Feedback
      showToast('Copied to Clipboard!', 'Tab closing automatically...');

      btnCopy.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied!</span>
      `;

      // Auto close the editor tab
      setTimeout(() => {
        window.close();
      }, 700);

    } catch (err) {
      console.error('Clipboard copy error:', err);
      showToast('Copy Failed', 'Please grant clipboard permissions or click inside tab.');
      btnCopy.disabled = false;
      btnCopy.innerHTML = `
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy to Clipboard</span>
        <kbd class="kbd-hint">Ctrl+C</kbd>
      `;
    }
  }

  function showToast(title, desc) {
    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toast.classList.remove('hidden');
  }
})();
