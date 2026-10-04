// QA Screenshot Editor Logic
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
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');

  // State
  let currentColor = '#ef4444'; // Crimson Red default
  let currentStroke = 4;        // 4px default
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let tempSnapshot = null;
  let backgroundImage = null;

  // History Stacks
  const MAX_HISTORY = 30;
  let undoStack = [];
  let redoStack = [];

  // Initialize
  init();

  async function init() {
    setupEventListeners();
    await loadScreenshot();
  }

  // Load screenshot from chrome.storage.local
  async function loadScreenshot() {
    let screenshotDataUrl = null;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const data = await chrome.storage.local.get(['latestScreenshot', 'sourceTitle']);
        if (data && data.latestScreenshot) {
          screenshotDataUrl = data.latestScreenshot;
          if (data.sourceTitle) {
            document.title = `Annotate: ${data.sourceTitle}`;
          }
        }
      } catch (err) {
        console.error('Failed to load screenshot from chrome.storage:', err);
      }
    }

    // Fallback placeholder if opened directly in browser without extension context
    if (!screenshotDataUrl) {
      createPlaceholderImage();
      return;
    }

    renderImage(screenshotDataUrl);
  }

  function renderImage(src) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      backgroundImage = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw initial image
      ctx.drawImage(img, 0, 0);

      // Save initial state
      saveState();

      // Display dimensions
      dimensionsBadge.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
    };
    img.onerror = () => {
      console.error('Failed to render screenshot image.');
      createPlaceholderImage();
    };
    img.src = src;
  }

  function createPlaceholderImage() {
    canvas.width = 1280;
    canvas.height = 720;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No screenshot found in storage. Ready for test drawing.', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Drag on canvas to draw red QA rectangles, then press Copy to Clipboard.', canvas.width / 2, canvas.height / 2 + 20);

    dimensionsBadge.textContent = '1280 × 720 px (Test Canvas)';
    saveState();
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
    // Canvas Mouse Events
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

    // Action buttons
    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);
    btnClear.addEventListener('click', clearAll);
    btnCopy.addEventListener('click', copyToClipboard);

    // Keyboard Shortcuts
    window.addEventListener('keydown', onKeyDown);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return; // Left mouse button only

    const coords = getCanvasCoordinates(e);
    startX = coords.x;
    startY = coords.y;
    isDrawing = true;

    // Cache current state as snapshot for live dragging preview
    tempSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function onMouseMove(e) {
    if (!isDrawing || !tempSnapshot) return;

    const coords = getCanvasCoordinates(e);
    const currentX = coords.x;
    const currentY = coords.y;

    // Restore snapshot before drawing current rectangle preview
    ctx.putImageData(tempSnapshot, 0, 0);

    const rx = Math.min(startX, currentX);
    const ry = Math.min(startY, currentY);
    const rw = Math.abs(currentX - startX);
    const rh = Math.abs(currentY - startY);

    if (rw === 0 || rh === 0) return;

    // Draw rectangle outline
    ctx.save();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStroke;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;

    const coords = getCanvasCoordinates(e);
    const rw = Math.abs(coords.x - startX);
    const rh = Math.abs(coords.y - startY);

    // Only commit if rectangle has noticeable dimensions (> 3px)
    if (rw > 3 && rh > 3) {
      saveState();
    } else if (tempSnapshot) {
      // Revert accidental click without drag
      ctx.putImageData(tempSnapshot, 0, 0);
    }
    tempSnapshot = null;
  }

  // History Management
  function saveState() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.push(imageData);
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = []; // Reset redo stack on new action
    updateHistoryButtons();
  }

  function undo() {
    if (undoStack.length <= 1) return; // Keep at least the base image

    const currentState = undoStack.pop();
    redoStack.push(currentState);

    const previousState = undoStack[undoStack.length - 1];
    ctx.putImageData(previousState, 0, 0);

    updateHistoryButtons();
  }

  function redo() {
    if (redoStack.length === 0) return;

    const nextState = redoStack.pop();
    undoStack.push(nextState);
    ctx.putImageData(nextState, 0, 0);

    updateHistoryButtons();
  }

  function clearAll() {
    if (undoStack.length <= 1) return;

    // Reset to the very first state (clean screenshot)
    const baseState = undoStack[0];
    ctx.putImageData(baseState, 0, 0);

    undoStack = [baseState];
    redoStack = [];
    updateHistoryButtons();
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
    if (e.key === 'Escape' && isDrawing && tempSnapshot) {
      ctx.putImageData(tempSnapshot, 0, 0);
      isDrawing = false;
      tempSnapshot = null;
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
