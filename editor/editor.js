// Screen Snap Editor Logic with Top URL Bar
(() => {
  const canvas = document.getElementById('screenshot-canvas');
  const canvasContainer = document.getElementById('canvas-container');
  const workspace = document.getElementById('workspace');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dimensionsBadge = document.getElementById('image-dimensions');
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  const toastDesc = document.getElementById('toast-desc');

  // Toolbar Elements
  const toolBtns = document.querySelectorAll('.tool-btn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const customColorPicker = document.getElementById('custom-color-picker');
  const strokeBtns = document.querySelectorAll('.stroke-btn');
  const opacityControl = document.getElementById('opacity-control');
  const opacitySlider = document.getElementById('opacity-slider');
  const opacityVal = document.getElementById('opacity-val');
  const toolContextGroup = document.getElementById('tool-context-group');
  const blurControls = document.getElementById('blur-controls');
  const redactModeBtns = document.querySelectorAll('.mode-btn');
  const blurIntensitySlider = document.getElementById('blur-intensity-slider');
  const blurIntensityVal = document.getElementById('blur-intensity-val');
  const toggleUrlBar = document.getElementById('toggle-url-bar');
  const cropControls = document.getElementById('crop-controls');
  const btnCropApply = document.getElementById('btn-crop-apply');
  const btnCropCancel = document.getElementById('btn-crop-cancel');
  const cropDimBadge = document.getElementById('crop-dim-badge');
  const cropFloatingBar = document.getElementById('crop-floating-bar');
  const btnCropApplyFloat = document.getElementById('btn-crop-apply-float');
  const btnCropCancelFloat = document.getElementById('btn-crop-cancel-float');
  const cropFloatingDim = document.getElementById('crop-floating-dim');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnDelete = document.getElementById('btn-delete');
  const btnClear = document.getElementById('btn-clear');
  const btnCopy = document.getElementById('btn-copy');
  const btnSave = document.getElementById('btn-save');
  const saveFormatSelect = document.getElementById('save-format');
  const qualityControl = document.getElementById('quality-control');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityVal = document.getElementById('quality-val');
  const btnFilenameTemplate = document.getElementById('btn-filename-template');
  const templatePanel = document.getElementById('filename-template-panel');
  const templateInput = document.getElementById('filename-template');
  const templateTokens = document.getElementById('template-tokens');
  const templatePreview = document.getElementById('template-preview');
  const btnTemplateReset = document.getElementById('btn-template-reset');

  // Drawing & State
  let currentTool = 'rectangle'; // 'select' | 'crop' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'step' | 'highlighter' | 'blur' | 'text'
  let previousTool = 'rectangle';
  let currentColor = '#ef4444'; // Crimson Red default
  let currentStroke = 4;        // 4px default
  let currentOpacity = 0.4;     // 40% default semi-transparent opacity for highlighter
  let currentRedactMode = 'pixelate'; // 'pixelate' | 'blur'
  let currentRedactIntensity = 3;      // 1 to 5 (default: 3)
  let currentHighlighterPoints = [];
  let showUrlBar = true;
  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let activeTextInput = null;

  // Export State
  const SAVE_FORMATS = {
    png: { label: 'PNG', mime: 'image/png', ext: 'png' },
    jpeg: { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    webp: { label: 'WebP', mime: 'image/webp', ext: 'webp' },
    pdf: { label: 'PDF', mime: 'application/pdf', ext: 'pdf' },
  };
  let saveFormat = 'png';
  let saveQuality = 0.92;

  // Filename Template State
  const DEFAULT_FILENAME_TEMPLATE = 'screen-snap_{date}_{time}';
  const FILENAME_TEMPLATE_STORAGE_KEY = 'filenameTemplate';
  const MAX_FILENAME_LENGTH = 120;
  let filenameTemplate = DEFAULT_FILENAME_TEMPLATE;
  let templateSaveTimer = null;

  // Crop State
  let cropBox = null; // { x, y, w, h } in screenshot baseImage coordinates
  let cropDragMode = null; // 'draw' | 'move' | 'resize'
  let activeCropHandle = null;
  let cropStartSnapshot = null;

  // Selection and Manipulation State
  let selectedShapeIndex = -1;
  let dragMode = null; // 'draw' | 'move' | 'resize'
  let activeHandle = null;
  let dragStartCoords = { x: 0, y: 0 };
  let shapeStartSnapshot = null;
  let hasMovedOrResized = false;

  // Eraser State
  let hoveredEraserIndex = -1;
  let isErasing = false;
  let erasedInCurrentDrag = false;

  // Deep clone helpers for shapes with nested points arrays
  function cloneShape(s) {
    if (!s) return s;
    if (s.points) {
      return { ...s, points: s.points.map(p => ({ ...p })) };
    }
    return { ...s };
  }

  function cloneShapes(list) {
    return list.map(cloneShape);
  }

  // Metadata
  let sourceUrl = '';
  let sourceTitle = 'Screenshot';
  let capturedAt = Date.now();
  let baseImage = null; // HTMLImageElement or Canvas fallback

  // Shape-based History (preserves quality and enables seamless URL bar toggling)
  const MAX_HISTORY = 40;
  let shapes = []; // Array of shape objects
  let undoStack = [{ shapes: [], baseImage: null }]; // Stack of state snapshots { shapes, baseImage }
  let redoStack = [];

  // Live drag preview state
  let dragPreviewShape = null;

  // Initialize
  init();

  async function init() {
    setupEventListeners();
    setTool(currentTool);
    updateHistoryButtons();
    await loadScreenshot();
    await loadFilenameTemplate();
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
      if (undoStack.length === 1 && !undoStack[0].baseImage) {
        undoStack[0].baseImage = baseImage;
      }
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
    tctx.fillText('Notice the URL bar above! Draw shapes, lines, arrows, highlights, blur/pixelate, or text, then Copy.', testCanvas.width / 2, testCanvas.height / 2 + 20);

    baseImage = testCanvas;
    if (undoStack.length === 1 && !undoStack[0].baseImage) {
      undoStack[0].baseImage = baseImage;
    }
    render();
  }

  // Calculate banner height proportionally based on width
  function getBannerHeight() {
    if (!showUrlBar || !sourceUrl) return 0;
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
    return Math.max(40, Math.round(imgWidth * 0.025));
  }

  // Main Render Function: redraws banner, image, and all shapes
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

    // 3. Draw Committed Shapes
    for (const shape of shapes) {
      drawShape(shape, bannerHeight, false);
    }

    // 4. Draw Live Dragging Preview Shape
    if (dragPreviewShape) {
      drawShape(dragPreviewShape, bannerHeight, true);
    }

    // 5. Draw Selection Handles & Bounding Box (when in select tool and shape selected)
    if (currentTool === 'select' && selectedShapeIndex >= 0 && selectedShapeIndex < shapes.length) {
      drawSelectionUI(shapes[selectedShapeIndex], bannerHeight);
    }

    // 6. Draw Eraser Hover Highlight (when in eraser tool and hovering a shape)
    if (currentTool === 'eraser' && hoveredEraserIndex >= 0 && hoveredEraserIndex < shapes.length) {
      drawEraserPreview(shapes[hoveredEraserIndex], bannerHeight);
    }

    // 7. Draw Crop Overlay (when in crop tool and cropBox is defined)
    if (currentTool === 'crop' && cropBox) {
      drawCropUI(cropBox, bannerHeight);
    }

    // Update Dimensions Badge
    dimensionsBadge.textContent = `${canvas.width} × ${canvas.height} px`;

    // Update Floating Crop Bar if active
    updateCropFloatingBar();
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

    // Formatting date timestamp reliably without locale truncation quirks
    const dateObj = new Date(capturedAt);
    const Y = dateObj.getFullYear();
    const M = String(dateObj.getMonth() + 1).padStart(2, '0');
    const D = String(dateObj.getDate()).padStart(2, '0');
    const h = String(dateObj.getHours()).padStart(2, '0');
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    const s = String(dateObj.getSeconds()).padStart(2, '0');

    let formattedTimestamp = `${Y}-${M}-${D} ${h}:${m}:${s}`;
    if (width < 550 && width >= 380) {
      formattedTimestamp = `${h}:${m}:${s}`;
    } else if (width < 380 && width >= 260) {
      formattedTimestamp = `${h}:${m}`;
    } else if (width < 260) {
      formattedTimestamp = '';
    }

    const fontSize = Math.max(12, Math.round(height * 0.35));
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;

    let timeTextWidth = 0;
    const marginX = Math.round(height * 0.4);
    const timeRightX = width - marginX;

    // Draw Timestamp on the right if space permits
    if (formattedTimestamp) {
      timeTextWidth = ctx.measureText(formattedTimestamp).width;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(formattedTimestamp, timeRightX, y + height / 2);
    }

    // Address Bar Pill Container
    const pillPaddingY = Math.max(4, Math.round(height * 0.15));
    const pillHeight = height - pillPaddingY * 2;
    const pillX = marginX;
    const gap = formattedTimestamp ? Math.round(height * 0.6) : 0;
    const pillRightMargin = formattedTimestamp ? (timeRightX - timeTextWidth - gap) : (width - marginX);
    const pillWidth = Math.max(80, pillRightMargin - pillX);

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

  // Dispatcher for drawing any shape
  function drawShape(shape, bannerOffset = 0, isPreview = false) {
    if (!shape) return;
    if (shape.type === 'rectangle') {
      drawRectangle(shape.x, shape.y + bannerOffset, shape.w, shape.h, shape.color, shape.stroke);
    } else if (shape.type === 'ellipse') {
      drawEllipse(shape.x, shape.y + bannerOffset, shape.w, shape.h, shape.color, shape.stroke);
    } else if (shape.type === 'line') {
      drawLine(shape.x1, shape.y1 + bannerOffset, shape.x2, shape.y2 + bannerOffset, shape.color, shape.stroke);
    } else if (shape.type === 'arrow') {
      drawArrow(shape.x1, shape.y1 + bannerOffset, shape.x2, shape.y2 + bannerOffset, shape.color, shape.stroke);
    } else if (shape.type === 'highlighter') {
      drawHighlighter(shape.points, bannerOffset, shape.color, shape.stroke, shape.opacity);
    } else if (shape.type === 'blur') {
      drawRedaction(shape.x, shape.y + bannerOffset, shape.w, shape.h, shape.mode, shape.intensity, isPreview);
    } else if (shape.type === 'step') {
      drawStepMarker(shape, bannerOffset, isPreview);
    } else if (shape.type === 'text') {
      drawText(shape.text, shape.x, shape.y + bannerOffset, shape.color, shape.fontSize);
    }
  }

  // Cached offscreen canvas for blur & image sampling
  let offscreenCanvas = null;
  let offscreenCtx = null;
  function getOffscreenCanvas(w, h) {
    if (!offscreenCanvas) {
      offscreenCanvas = document.createElement('canvas');
      offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (offscreenCanvas.width < w || offscreenCanvas.height < h) {
      offscreenCanvas.width = Math.max(offscreenCanvas.width, w);
      offscreenCanvas.height = Math.max(offscreenCanvas.height, h);
    }
    return { canvas: offscreenCanvas, ctx: offscreenCtx };
  }

  function getPixelateBlockSize(intensity) {
    switch (intensity) {
      case 1: return 8;
      case 2: return 12;
      case 3: return 18;
      case 4: return 26;
      case 5: return 36;
      default: return 18;
    }
  }

  function getBlurRadius(intensity) {
    switch (intensity) {
      case 1: return 6;
      case 2: return 10;
      case 3: return 16;
      case 4: return 24;
      case 5: return 34;
      default: return 16;
    }
  }

  // Redaction renderer: executes pixelate or smooth blur on base image
  function drawRedaction(x, y, w, h, mode = 'pixelate', intensity = 3, isPreview = false) {
    const rx = Math.max(0, Math.floor(x));
    const ry = Math.max(0, Math.floor(y));
    const right = Math.min(canvas.width, Math.ceil(x + w));
    const bottom = Math.min(canvas.height, Math.ceil(y + h));
    const rw = right - rx;
    const rh = bottom - ry;
    if (rw <= 0 || rh <= 0) return;

    if (mode === 'blur') {
      drawSmoothBlur(rx, ry, rw, rh, getBlurRadius(intensity));
    } else {
      drawPixelate(rx, ry, rw, rh, getPixelateBlockSize(intensity));
    }

    // Draw live drag dashed boundary feedback
    if (isPreview) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.restore();
    }
  }

  // Sample blocks and average RGB colors to pixelate region
  function drawPixelate(rx, ry, rw, rh, blockSize) {
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const data = imgData.data;

    for (let by = 0; by < rh; by += blockSize) {
      const blockH = Math.min(blockSize, rh - by);
      for (let bx = 0; bx < rw; bx += blockSize) {
        const blockW = Math.min(blockSize, rw - bx);

        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let aSum = 0;
        let count = 0;

        for (let py = 0; py < blockH; py++) {
          for (let px = 0; px < blockW; px++) {
            const idx = ((by + py) * rw + (bx + px)) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            aSum += data[idx + 3];
            count++;
          }
        }

        const rAvg = Math.round(rSum / count);
        const gAvg = Math.round(gSum / count);
        const bAvg = Math.round(bSum / count);
        const aAvg = Math.round(aSum / count);

        for (let py = 0; py < blockH; py++) {
          for (let px = 0; px < blockW; px++) {
            const idx = ((by + py) * rw + (bx + px)) * 4;
            data[idx] = rAvg;
            data[idx + 1] = gAvg;
            data[idx + 2] = bAvg;
            data[idx + 3] = aAvg;
          }
        }
      }
    }

    ctx.putImageData(imgData, rx, ry);
  }

  // Smooth Gaussian Blur with edge padding to avoid transparent border bleed
  function drawSmoothBlur(rx, ry, rw, rh, blurRadius) {
    const pad = Math.ceil(blurRadius * 2);
    const srcX = Math.max(0, rx - pad);
    const srcY = Math.max(0, ry - pad);
    const srcRight = Math.min(canvas.width, rx + rw + pad);
    const srcBottom = Math.min(canvas.height, ry + rh + pad);
    const srcW = srcRight - srcX;
    const srcH = srcBottom - srcY;

    if (srcW <= 0 || srcH <= 0) return;

    const { canvas: offCanvas, ctx: offCtx } = getOffscreenCanvas(srcW, srcH);
    offCtx.clearRect(0, 0, srcW, srcH);
    offCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    if ('filter' in ctx) {
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.drawImage(offCanvas, 0, 0, srcW, srcH, srcX, srcY, srcW, srcH);
    } else {
      // Hardware-independent downscale & upscale fallback
      const scale = Math.max(0.1, 1 / (blurRadius / 2));
      const downW = Math.max(2, Math.round(srcW * scale));
      const downH = Math.max(2, Math.round(srcH * scale));
      const { canvas: downCanvas, ctx: downCtx } = getOffscreenCanvas(downW, downH);
      downCtx.drawImage(offCanvas, 0, 0, srcW, srcH, 0, 0, downW, downH);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(downCanvas, 0, 0, downW, downH, srcX, srcY, srcW, srcH);
    }
    ctx.restore();
  }

  // Helper: Draw semi-transparent wide stroke highlighter
  function drawHighlighter(points, bannerOffset, color, stroke, opacity = 0.4) {
    if (!points || points.length === 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y + bannerOffset, stroke / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y + bannerOffset);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y + bannerOffset);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // Helper: Calculate wide stroke size for highlighter
  function getHighlighterStroke(stroke) {
    switch (stroke) {
      case 2: return 14;
      case 4: return 24;
      case 7: return 36;
      case 11: return 52;
      default: return Math.max(14, stroke * 5);
    }
  }

  // Helper: Draw high-legibility bold text annotation
  function drawText(text, x, y, color, fontSize) {
    ctx.save();
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Drop shadow for legibility over both dark and light backgrounds
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.max(3, Math.round(fontSize * 0.12));
    ctx.shadowOffsetX = Math.max(1, Math.round(fontSize * 0.04));
    ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.04));

    ctx.fillStyle = color;

    const lines = text.split('\n');
    const lineHeight = fontSize * 1.25;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + (i * lineHeight));
    }

    ctx.restore();
  }

  function getBaseFontSize(stroke) {
    switch (stroke) {
      case 2: return 16;
      case 4: return 22;
      case 7: return 32;
      case 11: return 44;
      default: return 22;
    }
  }

  // Helper: Numbered Step Markers
  function getNextStepNumber(shapesList = shapes) {
    return shapesList.filter(s => s.type === 'step').length + 1;
  }

  function renumberSteps(shapesList = shapes) {
    let count = 1;
    for (const shape of shapesList) {
      if (shape.type === 'step') {
        shape.number = count++;
      }
    }
  }

  // Determine brightness for high contrast text & rings (perceived luminance)
  function isBrightColor(hex) {
    if (!hex || typeof hex !== 'string') return false;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 175;
  }

  // Sizing metrics for step markers across all stroke sizes (2, 4, 7, 11)
  function getStepMetrics(stroke) {
    switch (stroke) {
      case 2:
        return { radius: 15, fontSize: 14, ringWidth: 2 };
      case 4:
        return { radius: 20, fontSize: 18, ringWidth: 2.5 };
      case 7:
        return { radius: 26, fontSize: 23, ringWidth: 3.5 };
      case 11:
        return { radius: 34, fontSize: 30, ringWidth: 4.5 };
      default: {
        const r = Math.max(15, Math.round(stroke * 3.2));
        return { radius: r, fontSize: Math.round(r * 0.9), ringWidth: Math.max(2, stroke * 0.35) };
      }
    }
  }

  // Render high-legibility numbered step circle marker
  function drawStepMarker(shape, bannerOffset = 0, isPreview = false) {
    const x = shape.x;
    const y = shape.y + bannerOffset;
    const stroke = shape.stroke || 4;
    const metrics = getStepMetrics(stroke);
    const color = shape.color || '#ef4444';
    const isBright = isBrightColor(color);
    const text = String(shape.number || 1);

    ctx.save();

    if (isPreview) {
      ctx.globalAlpha = 0.9;
    }

    // Outer drop shadow for clear separation on light/dark/busy backgrounds
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.max(4, Math.round(metrics.radius * 0.25));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(1.5, Math.round(metrics.radius * 0.1));

    // 1. Solid filled circle
    ctx.beginPath();
    ctx.arc(x, y, metrics.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Reset shadow so border ring and text remain crisp
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 2. High-contrast border ring
    ctx.lineWidth = metrics.ringWidth;
    ctx.strokeStyle = isBright ? 'rgba(15, 23, 42, 0.55)' : '#ffffff';
    ctx.stroke();

    // 3. Dynamic font scaling for 1, 2, or 3+ digit numbers
    let fontSize = metrics.fontSize;
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const maxAllowedWidth = metrics.radius * 1.45;
    if (textWidth > maxAllowedWidth) {
      fontSize = Math.floor(fontSize * (maxAllowedWidth / textWidth));
      ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    }

    // 4. Centered number text with contrast
    ctx.fillStyle = isBright ? '#0f172a' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);

    // If live drag preview, draw subtle dashed accent ring
    if (isPreview) {
      ctx.beginPath();
      ctx.arc(x, y, metrics.radius + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
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

  // Helper: Draw single ellipse
  function drawEllipse(x, y, w, h, color, stroke) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.1, w / 2), Math.max(0.1, h / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Helper: Draw single straight line
  function drawLine(x1, y1, x2, y2, color, stroke) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.hypot(dx, dy) < 1) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // Helper: Draw clean arrow with chevron wings (matching requested design)
  function drawArrow(x1, y1, x2, y2, color, stroke) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length < 2) return;

    const angle = Math.atan2(dy, dx);
    const headLength = Math.max(14, Math.min(stroke * 3.6, length * 0.45));
    const arrowAngle = 0.52; // ~30 degrees

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main shaft line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrowhead chevron wings
    ctx.beginPath();
    ctx.moveTo(
      x2 - headLength * Math.cos(angle - arrowAngle),
      y2 - headLength * Math.sin(angle - arrowAngle)
    );
    ctx.lineTo(x2, y2);
    ctx.lineTo(
      x2 - headLength * Math.cos(angle + arrowAngle),
      y2 - headLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();

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

  // Hit-Testing and Geometry Helpers
  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function getNormalizedBox(shape) {
    const x = Math.min(shape.x, shape.x + shape.w);
    const y = Math.min(shape.y, shape.y + shape.h);
    const w = Math.abs(shape.w);
    const h = Math.abs(shape.h);
    return { x, y, w, h };
  }

  function getShapeBounds(shape) {
    if (!shape) return { x: 0, y: 0, w: 0, h: 0 };
    if (shape.type === 'rectangle' || shape.type === 'ellipse' || shape.type === 'blur') {
      return getNormalizedBox(shape);
    }
    if (shape.type === 'line' || shape.type === 'arrow') {
      const minX = Math.min(shape.x1, shape.x2);
      const maxX = Math.max(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      const maxY = Math.max(shape.y1, shape.y2);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    if (shape.type === 'step') {
      const r = getStepMetrics(shape.stroke || 4).radius;
      return { x: shape.x - r, y: shape.y - r, w: r * 2, h: r * 2 };
    }
    if (shape.type === 'text') {
      const lines = (shape.text || '').split('\n');
      ctx.save();
      ctx.font = `700 ${shape.fontSize || 22}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
      let maxW = 20;
      for (const line of lines) {
        const m = ctx.measureText(line).width;
        if (m > maxW) maxW = m;
      }
      ctx.restore();
      const lineH = (shape.fontSize || 22) * 1.25;
      return { x: shape.x, y: shape.y, w: maxW, h: Math.max(lineH, lines.length * lineH) };
    }
    if (shape.type === 'highlighter') {
      if (!shape.points || shape.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of shape.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const pad = (shape.stroke || 20) / 2;
      return { x: minX - pad, y: minY - pad, w: (maxX - minX) + pad * 2, h: (maxY - minY) + pad * 2 };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function hitTestShape(shape, px, py) {
    if (!shape) return false;
    if (shape.type === 'rectangle') {
      const b = getNormalizedBox(shape);
      const pad = Math.max(6, (shape.stroke || 4) / 2 + 4);
      return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
    }
    if (shape.type === 'ellipse') {
      const b = getNormalizedBox(shape);
      const pad = Math.max(6, (shape.stroke || 4) / 2 + 4);
      const rx = b.w / 2;
      const ry = b.h / 2;
      if (rx <= 0 || ry <= 0) return false;
      const cx = b.x + rx;
      const cy = b.y + ry;
      const val = Math.pow((px - cx) / (rx + pad), 2) + Math.pow((py - cy) / (ry + pad), 2);
      return val <= 1;
    }
    if (shape.type === 'blur') {
      const b = getNormalizedBox(shape);
      return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    }
    if (shape.type === 'line' || shape.type === 'arrow') {
      const pad = Math.max(8, (shape.stroke || 4) / 2 + 5);
      return distToSegment(px, py, shape.x1, shape.y1, shape.x2, shape.y2) <= pad;
    }
    if (shape.type === 'step') {
      const r = getStepMetrics(shape.stroke || 4).radius;
      return Math.hypot(px - shape.x, py - shape.y) <= r + 6;
    }
    if (shape.type === 'text') {
      const b = getShapeBounds(shape);
      return px >= b.x - 6 && px <= b.x + b.w + 6 && py >= b.y - 6 && py <= b.y + b.h + 6;
    }
    if (shape.type === 'highlighter') {
      if (!shape.points || shape.points.length === 0) return false;
      const pad = Math.max(10, (shape.stroke || 20) / 2 + 6);
      if (shape.points.length === 1) {
        return Math.hypot(px - shape.points[0].x, py - shape.points[0].y) <= pad;
      }
      for (let i = 0; i < shape.points.length - 1; i++) {
        if (distToSegment(px, py, shape.points[i].x, shape.points[i].y, shape.points[i + 1].x, shape.points[i + 1].y) <= pad) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  function getShapeAt(px, py) {
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (hitTestShape(shapes[i], px, py)) {
        return i;
      }
    }
    return -1;
  }

  function getShapeHandles(shape) {
    if (!shape) return [];
    if (shape.type === 'line' || shape.type === 'arrow') {
      return [
        { id: 'start', x: shape.x1, y: shape.y1, cursor: 'crosshair', type: 'point' },
        { id: 'end', x: shape.x2, y: shape.y2, cursor: 'crosshair', type: 'point' }
      ];
    }
    if (shape.type === 'step' || shape.type === 'text' || shape.type === 'highlighter') {
      const b = getShapeBounds(shape);
      return [
        { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
        { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
        { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
        { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' }
      ];
    }
    if (shape.type === 'rectangle' || shape.type === 'ellipse' || shape.type === 'blur') {
      const b = getNormalizedBox(shape);
      return [
        { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
        { id: 'n', x: b.x + b.w / 2, y: b.y, cursor: 'ns-resize' },
        { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
        { id: 'e', x: b.x + b.w, y: b.y + b.h / 2, cursor: 'ew-resize' },
        { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
        { id: 's', x: b.x + b.w / 2, y: b.y + b.h, cursor: 'ns-resize' },
        { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
        { id: 'w', x: b.x, y: b.y + b.h / 2, cursor: 'ew-resize' }
      ];
    }
    return [];
  }

  function hitTestHandles(shape, px, py) {
    if (!shape) return null;
    const handles = getShapeHandles(shape);
    for (const h of handles) {
      if (Math.hypot(px - h.x, py - h.y) <= 8.5) {
        return h;
      }
    }
    return null;
  }

  // Draw Selection Box and Transform Handles
  function drawSelectionUI(shape, bannerOffset = 0) {
    if (!shape) return;
    ctx.save();

    // 1. Draw Selection Outline
    if (shape.type === 'line' || shape.type === 'arrow') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = Math.max(6, (shape.stroke || 4) + 6);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1 + bannerOffset);
      ctx.lineTo(shape.x2, shape.y2 + bannerOffset);
      ctx.stroke();
    } else if (shape.type === 'step') {
      const r = getStepMetrics(shape.stroke || 4).radius;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(shape.x, shape.y + bannerOffset, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const b = getShapeBounds(shape);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(b.x - 2, b.y + bannerOffset - 2, b.w + 4, b.h + 4);
      ctx.setLineDash([]);
    }

    // 2. Draw Resize Handles
    const handles = getShapeHandles(shape);
    for (const h of handles) {
      const hy = h.y + bannerOffset;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      if (h.type === 'point') {
        ctx.beginPath();
        ctx.arc(h.x, hy, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0284c7';
        ctx.stroke();
      } else {
        const size = 8;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(h.x - size / 2, hy - size / 2, size, size);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(h.x - size / 2, hy - size / 2, size, size);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw Eraser Hover Highlight
  function drawEraserPreview(shape, bannerOffset = 0) {
    if (!shape) return;
    ctx.save();

    if (shape.type === 'line' || shape.type === 'arrow') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.lineWidth = Math.max(8, (shape.stroke || 4) + 8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1 + bannerOffset);
      ctx.lineTo(shape.x2, shape.y2 + bannerOffset);
      ctx.stroke();
    } else if (shape.type === 'step') {
      const r = getStepMetrics(shape.stroke || 4).radius;
      // Red tint fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(shape.x, shape.y + bannerOffset, r + 4, 0, Math.PI * 2);
      ctx.fill();
      // Red dashed border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const b = getShapeBounds(shape);
      // Red tint fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(b.x - 3, b.y + bannerOffset - 3, b.w + 6, b.h + 6);
      // Red dashed border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(b.x - 3, b.y + bannerOffset - 3, b.w + 6, b.h + 6);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Erase Shape Operation
  function eraseShape(index) {
    if (index < 0 || index >= shapes.length) return;
    const removed = shapes.splice(index, 1)[0];
    erasedInCurrentDrag = true;
    if (selectedShapeIndex === index) {
      selectedShapeIndex = -1;
    } else if (selectedShapeIndex > index) {
      selectedShapeIndex--;
    }
    hoveredEraserIndex = -1;
    if (removed && removed.type === 'step') {
      renumberSteps(shapes);
    }
    updateDeleteButton();
    updateHistoryButtons();
    render();
  }

  // Selection Management
  function selectShape(index) {
    if (index < 0 || index >= shapes.length) {
      selectedShapeIndex = -1;
      updateDeleteButton();
      render();
      return;
    }

    selectedShapeIndex = index;
    const shape = shapes[index];
    updateDeleteButton();

    // Synchronize toolbar with selected shape styling
    if (shape.color) {
      currentColor = shape.color;
      let matched = false;
      colorBtns.forEach(b => {
        const matches = b.dataset.color.toLowerCase() === currentColor.toLowerCase();
        b.classList.toggle('active', matches);
        if (matches) matched = true;
      });
      if (customColorPicker) {
        customColorPicker.value = currentColor;
      }
    }

    if (shape.stroke) {
      currentStroke = shape.stroke;
      strokeBtns.forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.stroke, 10) === currentStroke);
      });
    }

    if (shape.type === 'highlighter' && shape.opacity !== undefined) {
      currentOpacity = shape.opacity;
      if (opacitySlider) opacitySlider.value = Math.round(shape.opacity * 100);
      if (opacityVal) opacityVal.textContent = `${Math.round(shape.opacity * 100)}%`;
      if (toolContextGroup) toolContextGroup.classList.add('active');
      if (opacityControl) opacityControl.classList.add('highlight-active');
      if (blurControls) blurControls.classList.remove('blur-active');
    } else if (shape.type === 'blur') {
      if (shape.mode) {
        currentRedactMode = shape.mode;
        redactModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === shape.mode));
      }
      if (shape.intensity !== undefined) {
        currentRedactIntensity = shape.intensity;
        if (blurIntensitySlider) blurIntensitySlider.value = shape.intensity;
        if (blurIntensityVal) blurIntensityVal.textContent = shape.intensity;
      }
      if (toolContextGroup) toolContextGroup.classList.add('active');
      if (blurControls) blurControls.classList.add('blur-active');
      if (opacityControl) opacityControl.classList.remove('highlight-active');
    }

    render();
  }

  function updateDeleteButton() {
    if (btnDelete) {
      btnDelete.disabled = (selectedShapeIndex < 0 || selectedShapeIndex >= shapes.length);
    }
  }

  function deleteSelectedShape() {
    if (selectedShapeIndex < 0 || selectedShapeIndex >= shapes.length) return;
    const removed = shapes.splice(selectedShapeIndex, 1)[0];
    selectedShapeIndex = -1;
    updateDeleteButton();
    if (removed && removed.type === 'step') {
      renumberSteps(shapes);
    }
    commitHistory();
    render();
  }

  // Move transformation helper
  function applyMove(target, snapshot, dx, dy) {
    if (target.type === 'rectangle' || target.type === 'ellipse' || target.type === 'blur' || target.type === 'text' || target.type === 'step') {
      target.x = snapshot.x + dx;
      target.y = snapshot.y + dy;
    } else if (target.type === 'line' || target.type === 'arrow') {
      target.x1 = snapshot.x1 + dx;
      target.y1 = snapshot.y1 + dy;
      target.x2 = snapshot.x2 + dx;
      target.y2 = snapshot.y2 + dy;
    } else if (target.type === 'highlighter') {
      target.points = snapshot.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
  }

  // Resize transformation helper
  function applyResize(target, snapshot, handle, dx, dy, shiftKey, currentX, currentY) {
    const handleId = handle.id;

    if (target.type === 'line' || target.type === 'arrow') {
      if (handleId === 'start') {
        let x1 = snapshot.x1 + dx;
        let y1 = snapshot.y1 + dy;
        if (shiftKey) {
          const ldx = snapshot.x2 - x1;
          const ldy = snapshot.y2 - y1;
          const angle = Math.atan2(ldy, ldx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(ldx, ldy);
          x1 = snapshot.x2 - dist * Math.cos(snappedAngle);
          y1 = snapshot.y2 - dist * Math.sin(snappedAngle);
        }
        target.x1 = x1;
        target.y1 = y1;
      } else if (handleId === 'end') {
        let x2 = snapshot.x2 + dx;
        let y2 = snapshot.y2 + dy;
        if (shiftKey) {
          const ldx = x2 - snapshot.x1;
          const ldy = y2 - snapshot.y1;
          const angle = Math.atan2(ldy, ldx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(ldx, ldy);
          x2 = snapshot.x1 + dist * Math.cos(snappedAngle);
          y2 = snapshot.y1 + dist * Math.sin(snappedAngle);
        }
        target.x2 = x2;
        target.y2 = y2;
      }
      return;
    }

    if (target.type === 'step') {
      const origMetrics = getStepMetrics(snapshot.stroke || 4);
      const origDist = origMetrics.radius * Math.SQRT2;
      const currentDist = Math.hypot(currentX - snapshot.x, currentY - snapshot.y);
      const scale = Math.max(0.4, Math.min(3.0, currentDist / origDist));
      target.stroke = Math.max(2, Math.min(18, Math.round((snapshot.stroke || 4) * scale)));
      return;
    }

    if (target.type === 'text') {
      const bounds = getShapeBounds(snapshot);
      const scale = Math.max(0.4, Math.min(3.5, (bounds.w + dx) / Math.max(bounds.w, 10)));
      target.fontSize = Math.max(12, Math.min(100, Math.round((snapshot.fontSize || 22) * scale)));
      return;
    }

    if (target.type === 'highlighter') {
      const b = getShapeBounds(snapshot);
      if (b.w <= 0 || b.h <= 0) return;
      let scaleX = Math.max(0.2, (b.w + dx) / b.w);
      let scaleY = Math.max(0.2, (b.h + dy) / b.h);
      if (shiftKey) {
        scaleX = scaleY = Math.max(scaleX, scaleY);
      }
      target.points = snapshot.points.map(p => ({
        x: b.x + (p.x - b.x) * scaleX,
        y: b.y + (p.y - b.y) * scaleY
      }));
      return;
    }

    // Box shapes: rectangle, ellipse, blur
    const orig = getNormalizedBox(snapshot);
    let newX = orig.x;
    let newY = orig.y;
    let newW = orig.w;
    let newH = orig.h;

    if (handleId === 'e') {
      newW = Math.max(6, orig.w + dx);
    } else if (handleId === 'w') {
      newW = Math.max(6, orig.w - dx);
      newX = orig.x + (orig.w - newW);
    } else if (handleId === 's') {
      newH = Math.max(6, orig.h + dy);
    } else if (handleId === 'n') {
      newH = Math.max(6, orig.h - dy);
      newY = orig.y + (orig.h - newH);
    } else if (handleId === 'se') {
      newW = Math.max(6, orig.w + dx);
      newH = Math.max(6, orig.h + dy);
      if (shiftKey) {
        const sz = Math.max(newW, newH);
        newW = sz;
        newH = sz;
      }
    } else if (handleId === 'sw') {
      newW = Math.max(6, orig.w - dx);
      newX = orig.x + (orig.w - newW);
      newH = Math.max(6, orig.h + dy);
      if (shiftKey) {
        const sz = Math.max(newW, newH);
        newX = orig.x + (orig.w - sz);
        newW = sz;
        newH = sz;
      }
    } else if (handleId === 'ne') {
      newW = Math.max(6, orig.w + dx);
      newH = Math.max(6, orig.h - dy);
      newY = orig.y + (orig.h - newH);
      if (shiftKey) {
        const sz = Math.max(newW, newH);
        newY = orig.y + (orig.h - sz);
        newW = sz;
        newH = sz;
      }
    } else if (handleId === 'nw') {
      newW = Math.max(6, orig.w - dx);
      newX = orig.x + (orig.w - newW);
      newH = Math.max(6, orig.h - dy);
      newY = orig.y + (orig.h - newH);
      if (shiftKey) {
        const sz = Math.max(newW, newH);
        newX = orig.x + (orig.w - sz);
        newY = orig.y + (orig.h - sz);
        newW = sz;
        newH = sz;
      }
    }

    target.x = newX;
    target.y = newY;
    target.w = newW;
    target.h = newH;
  }

  // Crop Tool Operations
  function initCropBox() {
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
    const imgHeight = baseImage ? (baseImage.naturalHeight || baseImage.height) : 720;
    const padX = Math.max(16, Math.round(imgWidth * 0.05));
    const padY = Math.max(16, Math.round(imgHeight * 0.05));
    cropBox = {
      x: padX,
      y: padY,
      w: Math.max(50, imgWidth - padX * 2),
      h: Math.max(50, imgHeight - padY * 2)
    };
  }

  function getCropHandles(box) {
    if (!box) return [];
    const b = getNormalizedBox(box);
    return [
      { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
      { id: 'n', x: b.x + b.w / 2, y: b.y, cursor: 'ns-resize' },
      { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
      { id: 'e', x: b.x + b.w, y: b.y + b.h / 2, cursor: 'ew-resize' },
      { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
      { id: 's', x: b.x + b.w / 2, y: b.y + b.h, cursor: 'ns-resize' },
      { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
      { id: 'w', x: b.x, y: b.y + b.h / 2, cursor: 'ew-resize' }
    ];
  }

  function hitTestCropHandles(box, px, py) {
    if (!box) return null;
    const handles = getCropHandles(box);
    for (const h of handles) {
      if (Math.hypot(px - h.x, py - h.y) <= 12) {
        return h;
      }
    }
    return null;
  }

  function isPointInCropBox(box, px, py) {
    if (!box) return false;
    const b = getNormalizedBox(box);
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  function applyCropResize(snapshot, handleId, currentX, currentY, shiftKey) {
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
    const imgHeight = baseImage ? (baseImage.naturalHeight || baseImage.height) : 720;
    let { x, y, w, h } = snapshot;
    const minSize = 20;

    const cx = Math.max(0, Math.min(imgWidth, currentX));
    const cy = Math.max(0, Math.min(imgHeight, currentY));

    if (handleId.includes('e')) {
      w = Math.max(minSize, cx - x);
    }
    if (handleId.includes('s')) {
      h = Math.max(minSize, cy - y);
    }
    if (handleId.includes('w')) {
      const right = x + w;
      const newX = Math.min(right - minSize, cx);
      x = newX;
      w = right - newX;
    }
    if (handleId.includes('n')) {
      const bottom = y + h;
      const newY = Math.min(bottom - minSize, cy);
      y = newY;
      h = bottom - newY;
    }

    if (shiftKey && snapshot.w > 0 && snapshot.h > 0) {
      const aspect = snapshot.w / snapshot.h;
      if (handleId === 'nw' || handleId === 'ne' || handleId === 'sw' || handleId === 'se') {
        const currentRatio = w / h;
        if (currentRatio > aspect) {
          const newW = h * aspect;
          if (handleId.includes('w')) {
            x += (w - newW);
          }
          w = newW;
        } else {
          const newH = w / aspect;
          if (handleId.includes('n')) {
            y += (h - newH);
          }
          h = newH;
        }
      }
    }

    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }

  function applyCropMove(snapshot, dx, dy) {
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
    const imgHeight = baseImage ? (baseImage.naturalHeight || baseImage.height) : 720;
    let newX = snapshot.x + dx;
    let newY = snapshot.y + dy;

    newX = Math.max(0, Math.min(imgWidth - snapshot.w, newX));
    newY = Math.max(0, Math.min(imgHeight - snapshot.h, newY));

    return {
      x: Math.round(newX),
      y: Math.round(newY),
      w: snapshot.w,
      h: snapshot.h
    };
  }

  function drawCropUI(box, bannerOffset = 0) {
    if (!box) return;
    const b = getNormalizedBox(box);
    const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : canvas.width;
    const imgHeight = baseImage ? (baseImage.naturalHeight || baseImage.height) : canvas.height;
    const bx = b.x;
    const by = b.y + bannerOffset;
    const bw = b.w;
    const bh = b.h;

    ctx.save();

    // 1. Shroud outside crop region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    if (bannerOffset > 0) {
      ctx.fillRect(0, 0, canvas.width, bannerOffset);
    }
    if (b.y > 0) {
      ctx.fillRect(0, bannerOffset, imgWidth, b.y);
    }
    const bottomRemaining = imgHeight - (b.y + b.h);
    if (bottomRemaining > 0) {
      ctx.fillRect(0, bannerOffset + b.y + b.h, imgWidth, bottomRemaining);
    }
    if (b.x > 0) {
      ctx.fillRect(0, by, b.x, b.h);
    }
    const rightRemaining = imgWidth - (b.x + b.w);
    if (rightRemaining > 0) {
      ctx.fillRect(bx + bw, by, rightRemaining, b.h);
    }

    // 2. Crop box border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // 3. Rule of Thirds
    if (bw > 60 && bh > 60) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 3, by);
      ctx.lineTo(bx + bw / 3, by + bh);
      ctx.moveTo(bx + (2 * bw) / 3, by);
      ctx.lineTo(bx + (2 * bw) / 3, by + bh);
      ctx.moveTo(bx, by + bh / 3);
      ctx.lineTo(bx + bw, by + bh / 3);
      ctx.moveTo(bx, by + (2 * bh) / 3);
      ctx.lineTo(bx + bw, by + (2 * bh) / 3);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Corner L-brackets
    const cornerLen = Math.min(20, Math.min(bw, bh) / 3);
    const cornerThick = 3.5;
    ctx.fillStyle = '#ffffff';

    // NW
    ctx.fillRect(bx - 1.5, by - 1.5, cornerLen, cornerThick);
    ctx.fillRect(bx - 1.5, by - 1.5, cornerThick, cornerLen);
    // NE
    ctx.fillRect(bx + bw - cornerLen + 1.5, by - 1.5, cornerLen, cornerThick);
    ctx.fillRect(bx + bw - cornerThick + 1.5, by - 1.5, cornerThick, cornerLen);
    // SE
    ctx.fillRect(bx + bw - cornerLen + 1.5, by + bh - cornerThick + 1.5, cornerLen, cornerThick);
    ctx.fillRect(bx + bw - cornerThick + 1.5, by + bh - cornerLen + 1.5, cornerThick, cornerLen);
    // SW
    ctx.fillRect(bx - 1.5, by + bh - cornerThick + 1.5, cornerLen, cornerThick);
    ctx.fillRect(bx - 1.5, by + bh - cornerLen + 1.5, cornerThick, cornerLen);

    // 5. Center edge handles
    const handles = getCropHandles(b);
    for (const h of handles) {
      if (h.id === 'n' || h.id === 's' || h.id === 'e' || h.id === 'w') {
        const hy = h.y + bannerOffset;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#ffffff';
        if (h.id === 'n' || h.id === 's') {
          const ew = 24;
          const eh = 5;
          ctx.fillRect(h.x - ew / 2, hy - eh / 2, ew, eh);
        } else {
          const ew = 5;
          const eh = 24;
          ctx.fillRect(h.x - ew / 2, hy - eh / 2, ew, eh);
        }
        ctx.restore();
      }
    }

    // 6. Dimension badge pill
    const dimText = `${Math.round(bw)} × ${Math.round(bh)} px`;
    ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    const textMetrics = ctx.measureText(dimText);
    const badgeW = textMetrics.width + 16;
    const badgeH = 24;
    const badgeX = bx + 8;
    const badgeY = (by + 8 + badgeH <= by + bh) ? (by + 8) : Math.max(bannerOffset + 4, by - badgeH - 6);

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dimText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    ctx.restore();

    ctx.restore();
  }

  function updateCropFloatingBar() {
    if (!cropFloatingBar) return;
    if (currentTool !== 'crop' || !cropBox) {
      cropFloatingBar.classList.add('hidden');
      return;
    }
    const b = getNormalizedBox(cropBox);
    if (b.w < 10 || b.h < 10) {
      cropFloatingBar.classList.add('hidden');
      return;
    }

    cropFloatingBar.classList.remove('hidden');

    const dimStr = `${Math.round(b.w)} × ${Math.round(b.h)}`;
    if (cropFloatingDim) cropFloatingDim.textContent = dimStr;
    if (cropDimBadge) cropDimBadge.textContent = `${dimStr} px`;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    const bannerHeight = getBannerHeight();

    const screenX = (b.x + b.w / 2) * scaleX;
    const screenYBottom = (b.y + b.h + bannerHeight) * scaleY;

    let top = screenYBottom + 12;
    if (top + 45 > rect.height) {
      top = Math.max(10, screenYBottom - 48);
    }

    cropFloatingBar.style.left = `${Math.max(60, Math.min(rect.width - 60, screenX))}px`;
    cropFloatingBar.style.top = `${top}px`;
  }

  function applyCrop() {
    if (!cropBox || !baseImage) return;
    const b = getNormalizedBox(cropBox);
    const imgWidth = baseImage.naturalWidth || baseImage.width;
    const imgHeight = baseImage.naturalHeight || baseImage.height;

    const cropX = Math.round(Math.max(0, Math.min(imgWidth - 1, b.x)));
    const cropY = Math.round(Math.max(0, Math.min(imgHeight - 1, b.y)));
    const cropW = Math.round(Math.min(imgWidth - cropX, b.w));
    const cropH = Math.round(Math.min(imgHeight - cropY, b.h));

    if (cropW < 10 || cropH < 10) {
      showToast('Crop Area Too Small', 'Please select a larger region to crop.');
      return;
    }

    // 1. Create cropped base image canvas
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cctx = cropCanvas.getContext('2d');
    cctx.drawImage(baseImage, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    baseImage = cropCanvas;

    // 2. Shift all annotation shapes to preserve perfect alignment
    for (const shape of shapes) {
      applyMove(shape, cloneShape(shape), -cropX, -cropY);
    }

    // 3. Clear crop state and exit crop mode
    cropBox = null;
    cropDragMode = null;
    activeCropHandle = null;
    setTool(previousTool !== 'crop' ? previousTool : 'select');

    // 4. Save history snapshot and re-render
    commitHistory();
    render();
    showToast('Cropped Screenshot', `${cropW} × ${cropH} px (Ctrl+Z to undo)`);
  }

  function cancelCrop() {
    cropBox = null;
    cropDragMode = null;
    activeCropHandle = null;
    setTool(previousTool !== 'crop' ? previousTool : 'select');
    render();
  }

  // Event Listeners
  function setupEventListeners() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Tool selector buttons
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setTool(btn.dataset.tool);
      });
    });

    // Color buttons
    colorBtns.forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        if (activeTextInput) e.preventDefault();
      });
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentColor = btn.dataset.color;
        if (activeTextInput) {
          activeTextInput.color = currentColor;
          activeTextInput.textarea.style.color = currentColor;
        }
        // If a shape is selected, update its color
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex]) {
          const s = shapes[selectedShapeIndex];
          if (s.color !== undefined) {
            s.color = currentColor;
            commitHistory();
            render();
          }
        }
      });
    });

    // Custom color picker
    customColorPicker.addEventListener('input', (e) => {
      colorBtns.forEach(b => b.classList.remove('active'));
      currentColor = e.target.value;
      if (activeTextInput) {
        activeTextInput.color = currentColor;
        activeTextInput.textarea.style.color = currentColor;
      }
      // If a shape is selected, update its color
      if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex]) {
        const s = shapes[selectedShapeIndex];
        if (s.color !== undefined) {
          s.color = currentColor;
          commitHistory();
          render();
        }
      }
    });

    // Stroke buttons
    strokeBtns.forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        if (activeTextInput) e.preventDefault();
      });
      btn.addEventListener('click', () => {
        strokeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentStroke = parseInt(btn.dataset.stroke, 10);
        if (activeTextInput) {
          activeTextInput.baseFontSize = getBaseFontSize(currentStroke);
          activeTextInput.textarea.style.fontSize = `${activeTextInput.baseFontSize}px`;
          if (typeof activeTextInput.adjustSize === 'function') {
            activeTextInput.adjustSize();
          }
        }
        // If a shape is selected, update its stroke
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex]) {
          const s = shapes[selectedShapeIndex];
          if (s.stroke !== undefined) {
            s.stroke = currentStroke;
            if (s.type === 'text') {
              s.fontSize = getBaseFontSize(currentStroke);
            }
            commitHistory();
            render();
          }
        }
      });
    });

    // Opacity Slider
    if (opacitySlider) {
      opacitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        currentOpacity = val / 100;
        if (opacityVal) {
          opacityVal.textContent = `${val}%`;
        }
        // If selected shape is highlighter, update opacity live
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex] && shapes[selectedShapeIndex].type === 'highlighter') {
          shapes[selectedShapeIndex].opacity = currentOpacity;
          render();
        }
      });

      opacitySlider.addEventListener('change', () => {
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex] && shapes[selectedShapeIndex].type === 'highlighter') {
          commitHistory();
        }
      });
    }

    // Redaction Mode Toggle (Pixelate vs Blur)
    redactModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        redactModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRedactMode = btn.dataset.mode;
        // If a blur shape is selected, update its mode
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex] && shapes[selectedShapeIndex].type === 'blur') {
          shapes[selectedShapeIndex].mode = currentRedactMode;
          commitHistory();
          render();
        } else if (currentTool !== 'blur') {
          setTool('blur');
        }
      });
    });

    // Redaction Intensity Slider
    if (blurIntensitySlider) {
      blurIntensitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        currentRedactIntensity = val;
        if (blurIntensityVal) {
          blurIntensityVal.textContent = val;
        }
        // If selected shape is blur, update intensity live
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex] && shapes[selectedShapeIndex].type === 'blur') {
          shapes[selectedShapeIndex].intensity = currentRedactIntensity;
          render();
        } else if (currentTool !== 'blur') {
          setTool('blur');
        }
      });

      blurIntensitySlider.addEventListener('change', () => {
        if (selectedShapeIndex >= 0 && shapes[selectedShapeIndex] && shapes[selectedShapeIndex].type === 'blur') {
          commitHistory();
        }
      });
    }

    // Toggle URL Bar
    if (toggleUrlBar) {
      toggleUrlBar.addEventListener('change', (e) => {
        showUrlBar = e.target.checked;
        render();
      });
    }

    // Workspace click (clicks outside the canvas commit any active text input)
    if (workspace) {
      workspace.addEventListener('mousedown', (e) => {
        if (activeTextInput && !canvasContainer.contains(e.target)) {
          commitActiveText();
        }
      });
    }

    // Action buttons
    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);
    if (btnDelete) btnDelete.addEventListener('click', deleteSelectedShape);
    btnClear.addEventListener('click', clearAll);
    btnCopy.addEventListener('click', copyToClipboard);

    // Export format & quality
    if (saveFormatSelect) {
      saveFormatSelect.addEventListener('change', () => {
        saveFormat = SAVE_FORMATS[saveFormatSelect.value] ? saveFormatSelect.value : 'png';
        updateExportControls();
      });
    }
    if (qualitySlider) {
      qualitySlider.addEventListener('input', () => {
        const val = parseInt(qualitySlider.value, 10) || 92;
        saveQuality = val / 100;
        if (qualityVal) qualityVal.textContent = `${val}%`;
      });
    }
    if (btnSave) {
      btnSave.addEventListener('click', saveScreenshot);
    }
    updateExportControls();

    // Filename template popover
    if (btnFilenameTemplate && templatePanel) {
      btnFilenameTemplate.addEventListener('click', (e) => {
        e.stopPropagation();
        if (templatePanel.classList.contains('hidden')) {
          openTemplatePanel();
        } else {
          closeTemplatePanel();
        }
      });
    }
    if (templateInput) {
      templateInput.addEventListener('input', () => {
        filenameTemplate = templateInput.value;
        updateTemplatePreview();
        scheduleTemplateSave();
      });
      templateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          templateInput.blur();
        }
      });
    }
    if (templateTokens) {
      templateTokens.addEventListener('click', (e) => {
        const chip = e.target.closest('.token-chip');
        if (chip) insertTemplateToken(chip.dataset.token || '');
      });
    }
    if (btnTemplateReset) {
      btnTemplateReset.addEventListener('click', () => {
        filenameTemplate = DEFAULT_FILENAME_TEMPLATE;
        if (templateInput) templateInput.value = filenameTemplate;
        updateTemplatePreview();
        saveFilenameTemplate(filenameTemplate);
      });
    }
    document.addEventListener('mousedown', (e) => {
      if (!templatePanel || templatePanel.classList.contains('hidden')) return;
      if (templatePanel.contains(e.target)) return;
      if (btnFilenameTemplate && btnFilenameTemplate.contains(e.target)) return;
      closeTemplatePanel();
    });

    // Crop action buttons
    if (btnCropApply) btnCropApply.addEventListener('click', applyCrop);
    if (btnCropCancel) btnCropCancel.addEventListener('click', cancelCrop);
    if (btnCropApplyFloat) btnCropApplyFloat.addEventListener('click', applyCrop);
    if (btnCropCancelFloat) btnCropCancelFloat.addEventListener('click', cancelCrop);
    window.addEventListener('resize', updateCropFloatingBar);
    if (workspace) workspace.addEventListener('scroll', updateCropFloatingBar);

    // Keyboard Shortcuts
    window.addEventListener('keydown', onKeyDown);
  }

  function setTool(tool) {
    if (tool !== 'select' && tool !== 'crop' && tool !== 'eraser' && tool !== 'rectangle' && tool !== 'ellipse' && tool !== 'line' && tool !== 'arrow' && tool !== 'step' && tool !== 'highlighter' && tool !== 'blur' && tool !== 'text') return;
    if (activeTextInput && tool !== 'text') {
      commitActiveText();
    }

    if (tool === 'crop') {
      if (currentTool !== 'crop') {
        previousTool = currentTool;
      }
      initCropBox();
    } else if (currentTool === 'crop') {
      cropBox = null;
      cropDragMode = null;
      activeCropHandle = null;
      if (cropFloatingBar) cropFloatingBar.classList.add('hidden');
    }

    currentTool = tool;
    toolBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    canvas.classList.toggle('tool-select', tool === 'select');
    canvas.classList.toggle('tool-crop', tool === 'crop');
    canvas.classList.toggle('tool-eraser', tool === 'eraser');
    canvas.classList.toggle('tool-text', tool === 'text');
    canvas.classList.toggle('tool-highlighter', tool === 'highlighter');
    canvas.classList.toggle('tool-step', tool === 'step');

    if (tool !== 'select') {
      if (selectedShapeIndex >= 0) {
        selectShape(-1);
      }
    }
    if (tool !== 'select' && tool !== 'eraser' && tool !== 'crop') {
      canvas.style.cursor = '';
    }
    if (tool !== 'eraser') {
      hoveredEraserIndex = -1;
      isErasing = false;
    }

    if (toolContextGroup) {
      toolContextGroup.classList.toggle('active', tool === 'highlighter' || tool === 'blur' || tool === 'crop');
    }

    if (opacityControl) {
      opacityControl.classList.toggle('highlight-active', tool === 'highlighter');
    }

    if (blurControls) {
      blurControls.classList.toggle('blur-active', tool === 'blur');
    }

    if (cropControls) {
      cropControls.classList.toggle('crop-active', tool === 'crop');
    }

    // If switching to highlighter and currentColor is still initial red default, switch to classic yellow
    if (tool === 'highlighter' && currentColor === '#ef4444') {
      const yellowBtn = document.querySelector('.color-btn[data-color="#eab308"]');
      if (yellowBtn) {
        colorBtns.forEach(b => b.classList.remove('active'));
        yellowBtn.classList.add('active');
        currentColor = '#eab308';
      }
    }

    render();
  }

  // Active Text Annotation Operations
  function commitActiveText() {
    if (!activeTextInput) return;
    const data = activeTextInput;
    activeTextInput = null;
    data.isClosed = true;

    const text = data.textarea.value.trim();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const bannerHeight = getBannerHeight();

    // Compute coordinate relative to screenshot image below top banner
    const canvasX = (data.textarea.offsetLeft + 9.5) * scaleX;
    const canvasY = (data.textarea.offsetTop + 5.5) * scaleY - bannerHeight;

    if (data.textarea.parentNode) {
      data.textarea.remove();
    }

    if (text.length > 0) {
      const canvasFontSize = Math.max(12, Math.round(data.baseFontSize * scaleX));
      shapes.push({
        type: 'text',
        text,
        x: canvasX,
        y: canvasY,
        color: data.color,
        fontSize: canvasFontSize
      });
      commitHistory();
      render();
    }
  }

  function cancelActiveText() {
    if (!activeTextInput) return;
    const data = activeTextInput;
    activeTextInput = null;
    data.isClosed = true;
    if (data.textarea.parentNode) {
      data.textarea.remove();
    }
  }

  function spawnTextInput(clientX, clientY, initialText = '', initialColor = currentColor, initialFontSize = null) {
    commitActiveText(); // Commit any existing open text input first

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const containerX = clientX - rect.left;
    const containerY = clientY - rect.top;

    const baseFontSize = initialFontSize ? Math.round(initialFontSize / scaleX) : getBaseFontSize(currentStroke);
    const textarea = document.createElement('textarea');
    textarea.className = 'canvas-text-editor';
    textarea.placeholder = 'Type text...';
    textarea.spellcheck = false;
    textarea.rows = 1;
    if (initialText) {
      textarea.value = initialText;
    }

    // Keep textarea within visible bounds of the canvas container
    const minW = 140;
    const posX = Math.max(4, Math.min(containerX, rect.width - minW - 4));
    const posY = Math.max(4, Math.min(containerY, rect.height - 40));

    textarea.style.left = `${posX}px`;
    textarea.style.top = `${posY}px`;
    textarea.style.fontSize = `${baseFontSize}px`;
    textarea.style.color = initialColor;
    textarea.style.minWidth = `${minW}px`;

    const adjustSize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.width = 'auto';
      textarea.style.width = `${Math.max(minW, textarea.scrollWidth + 14)}px`;
    };

    const textData = {
      textarea,
      baseFontSize,
      scaleX,
      scaleY,
      color: initialColor,
      adjustSize,
      isClosed: false
    };

    activeTextInput = textData;

    textarea.addEventListener('input', adjustSize);

    textarea.addEventListener('keydown', (e) => {
      // Enter without Shift or Ctrl+Enter / Cmd+Enter commits text
      if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        commitActiveText();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelActiveText();
      }
    });

    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (!textData.isClosed && activeTextInput && activeTextInput.textarea === textarea) {
          commitActiveText();
        }
      }, 150);
    });

    canvasContainer.appendChild(textarea);
    adjustSize();

    // Focus after current event loop cycle to guarantee focus isn't overridden by mouse event
    setTimeout(() => {
      textarea.focus();
      if (initialText) {
        textarea.select();
      }
    }, 0);
  }

  function onMouseDown(e) {
    if (e.button !== 0) return; // Left mouse click only

    // If clicking on active text editor itself, allow native typing & selection
    if (e.target && e.target.classList.contains('canvas-text-editor')) {
      return;
    }

    if (currentTool === 'text') {
      e.preventDefault(); // Prevents canvas from stealing focus and triggering blur
      spawnTextInput(e.clientX, e.clientY);
      return;
    }

    if (activeTextInput) {
      commitActiveText();
    }

    const coords = getCanvasCoordinates(e);
    const bannerHeight = getBannerHeight();

    startX = coords.x;
    startY = coords.y - bannerHeight;

    // Crop mode interaction
    if (currentTool === 'crop') {
      const handle = hitTestCropHandles(cropBox, startX, startY);
      if (handle) {
        cropDragMode = 'resize';
        activeCropHandle = handle;
        cropStartSnapshot = { ...cropBox };
        dragStartCoords = { x: startX, y: startY };
        return;
      }
      if (isPointInCropBox(cropBox, startX, startY)) {
        cropDragMode = 'move';
        activeCropHandle = null;
        cropStartSnapshot = { ...cropBox };
        dragStartCoords = { x: startX, y: startY };
        return;
      }
      // Clicked outside crop box: start drawing a new crop region
      cropDragMode = 'draw';
      activeCropHandle = null;
      cropBox = { x: startX, y: startY, w: 0, h: 0 };
      cropStartSnapshot = { ...cropBox };
      dragStartCoords = { x: startX, y: startY };
      render();
      return;
    }

    // Selection mode interaction
    if (currentTool === 'select') {
      // 1. Check if clicked on a resize handle of the currently selected shape
      if (selectedShapeIndex >= 0 && selectedShapeIndex < shapes.length) {
        const handle = hitTestHandles(shapes[selectedShapeIndex], startX, startY);
        if (handle) {
          dragMode = 'resize';
          activeHandle = handle;
          dragStartCoords = { x: startX, y: startY };
          shapeStartSnapshot = cloneShape(shapes[selectedShapeIndex]);
          hasMovedOrResized = false;
          return;
        }
      }

      // 2. Check if clicked on any shape
      const hitIndex = getShapeAt(startX, startY);
      if (hitIndex >= 0) {
        selectShape(hitIndex);
        dragMode = 'move';
        activeHandle = null;
        dragStartCoords = { x: startX, y: startY };
        shapeStartSnapshot = cloneShape(shapes[hitIndex]);
        hasMovedOrResized = false;
        return;
      }

      // 3. Clicked empty canvas: deselect
      selectShape(-1);
      dragMode = null;
      return;
    }

    // Eraser mode interaction
    if (currentTool === 'eraser') {
      isErasing = true;
      erasedInCurrentDrag = false;
      const hitIndex = getShapeAt(startX, startY);
      if (hitIndex >= 0) {
        eraseShape(hitIndex);
      }
      return;
    }

    // Normal drawing tool workflow
    isDrawing = true;
    dragMode = 'draw';

    if (currentTool === 'step') {
      const stepNum = getNextStepNumber(shapes);
      dragPreviewShape = {
        type: 'step',
        x: startX,
        y: startY,
        number: stepNum,
        color: currentColor,
        stroke: currentStroke
      };
      render();
      return;
    }

    if (currentTool === 'highlighter') {
      currentHighlighterPoints = [{ x: startX, y: startY }];
      dragPreviewShape = {
        type: 'highlighter',
        points: [...currentHighlighterPoints],
        color: currentColor,
        stroke: getHighlighterStroke(currentStroke),
        opacity: currentOpacity
      };
      render();
    }
  }

  function onMouseMove(e) {
    const coords = getCanvasCoordinates(e);
    const bannerHeight = getBannerHeight();
    const currentX = coords.x;
    const currentY = coords.y - bannerHeight;

    // Handle cursor update when not dragging in select mode
    if (currentTool === 'select' && !dragMode) {
      if (selectedShapeIndex >= 0 && selectedShapeIndex < shapes.length) {
        const handle = hitTestHandles(shapes[selectedShapeIndex], currentX, currentY);
        if (handle) {
          canvas.style.cursor = handle.cursor || 'pointer';
          return;
        }
        if (hitTestShape(shapes[selectedShapeIndex], currentX, currentY)) {
          canvas.style.cursor = 'move';
          return;
        }
      }
      const hitIndex = getShapeAt(currentX, currentY);
      if (hitIndex >= 0) {
        canvas.style.cursor = 'pointer';
        return;
      }
      canvas.style.cursor = 'default';
      return;
    }

    // Handle eraser tool hover & drag-erasing
    if (currentTool === 'eraser') {
      const hitIndex = getShapeAt(currentX, currentY);
      hoveredEraserIndex = hitIndex;
      if (isErasing) {
        if (hitIndex >= 0) {
          eraseShape(hitIndex);
        }
      } else {
        canvas.style.cursor = (hitIndex >= 0) ? 'pointer' : 'crosshair';
        render();
      }
      return;
    }

    // Handle crop tool drag & hover cursors
    if (currentTool === 'crop') {
      const imgWidth = baseImage ? (baseImage.naturalWidth || baseImage.width) : 1280;
      const imgHeight = baseImage ? (baseImage.naturalHeight || baseImage.height) : 720;

      if (cropDragMode === 'resize') {
        cropBox = applyCropResize(cropStartSnapshot, activeCropHandle.id, currentX, currentY, e.shiftKey);
        render();
        return;
      }
      if (cropDragMode === 'move') {
        const dx = currentX - dragStartCoords.x;
        const dy = currentY - dragStartCoords.y;
        cropBox = applyCropMove(cropStartSnapshot, dx, dy);
        render();
        return;
      }
      if (cropDragMode === 'draw') {
        const cx = Math.max(0, Math.min(imgWidth, currentX));
        const cy = Math.max(0, Math.min(imgHeight, currentY));
        cropBox = {
          x: Math.min(dragStartCoords.x, cx),
          y: Math.min(dragStartCoords.y, cy),
          w: Math.abs(cx - dragStartCoords.x),
          h: Math.abs(cy - dragStartCoords.y)
        };
        render();
        return;
      }

      // Not dragging: update cursor
      const handle = hitTestCropHandles(cropBox, currentX, currentY);
      if (handle) {
        canvas.style.cursor = handle.cursor;
      } else if (isPointInCropBox(cropBox, currentX, currentY)) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'crosshair';
      }
      return;
    }

    // Handle moving an annotation
    if (dragMode === 'move') {
      if (selectedShapeIndex < 0 || selectedShapeIndex >= shapes.length || !shapeStartSnapshot) return;
      const dx = currentX - dragStartCoords.x;
      const dy = currentY - dragStartCoords.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        hasMovedOrResized = true;
      }
      const target = shapes[selectedShapeIndex];
      applyMove(target, shapeStartSnapshot, dx, dy);
      render();
      return;
    }

    // Handle resizing an annotation
    if (dragMode === 'resize') {
      if (selectedShapeIndex < 0 || selectedShapeIndex >= shapes.length || !shapeStartSnapshot || !activeHandle) return;
      const dx = currentX - dragStartCoords.x;
      const dy = currentY - dragStartCoords.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        hasMovedOrResized = true;
      }
      const target = shapes[selectedShapeIndex];
      applyResize(target, shapeStartSnapshot, activeHandle, dx, dy, e.shiftKey, currentX, currentY);
      render();
      return;
    }

    // Handle drawing new shapes
    if (!isDrawing) return;

    if (currentTool === 'rectangle' || currentTool === 'ellipse' || currentTool === 'blur') {
      let rw = Math.abs(currentX - startX);
      let rh = Math.abs(currentY - startY);

      if (e.shiftKey) {
        // Holding Shift constrains to 1:1 aspect ratio (circle for ellipse, square for rectangle/blur)
        const size = Math.max(rw, rh);
        rw = size;
        rh = size;
      }

      if (rw === 0 || rh === 0) return;

      const rx = currentX >= startX ? startX : startX - rw;
      const ry = currentY >= startY ? startY : startY - rh;

      if (currentTool === 'blur') {
        dragPreviewShape = {
          type: 'blur',
          mode: currentRedactMode,
          intensity: currentRedactIntensity,
          x: rx,
          y: ry,
          w: rw,
          h: rh
        };
      } else {
        dragPreviewShape = {
          type: currentTool,
          x: rx,
          y: ry,
          w: rw,
          h: rh,
          color: currentColor,
          stroke: currentStroke
        };
      }
    } else if (currentTool === 'arrow' || currentTool === 'line') {
      let endX = currentX;
      let endY = currentY;

      if (e.shiftKey) {
        // Holding Shift snaps line / arrow to 45 degree increments
        const dx = currentX - startX;
        const dy = currentY - startY;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.hypot(dx, dy);
        endX = startX + dist * Math.cos(snappedAngle);
        endY = startY + dist * Math.sin(snappedAngle);
      }

      const dist = Math.hypot(endX - startX, endY - startY);
      if (dist < 2) return;

      dragPreviewShape = {
        type: currentTool,
        x1: startX,
        y1: startY,
        x2: endX,
        y2: endY,
        color: currentColor,
        stroke: currentStroke
      };
    } else if (currentTool === 'highlighter') {
      let ptX = currentX;
      let ptY = currentY;

      if (e.shiftKey) {
        // Shift key locks highlighter to straight horizontal (or vertical) axis across text
        const dx = Math.abs(currentX - startX);
        const dy = Math.abs(currentY - startY);
        if (dx >= dy) {
          ptY = startY; // Clean horizontal highlight across text
        } else {
          ptX = startX; // Clean vertical highlight
        }
        currentHighlighterPoints = [
          { x: startX, y: startY },
          { x: ptX, y: ptY }
        ];
      } else {
        const lastPt = currentHighlighterPoints[currentHighlighterPoints.length - 1];
        if (!lastPt || Math.hypot(ptX - lastPt.x, ptY - lastPt.y) >= 2) {
          currentHighlighterPoints.push({ x: ptX, y: ptY });
        }
      }

      dragPreviewShape = {
        type: 'highlighter',
        points: [...currentHighlighterPoints],
        color: currentColor,
        stroke: getHighlighterStroke(currentStroke),
        opacity: currentOpacity
      };
    } else if (currentTool === 'step') {
      if (dragPreviewShape) {
        dragPreviewShape.x = currentX;
        dragPreviewShape.y = currentY;
      }
    }

    render();
  }

  function onMouseUp(e) {
    if (currentTool === 'crop' && cropDragMode) {
      if (cropDragMode === 'draw') {
        cropBox = getNormalizedBox(cropBox);
        if (cropBox.w < 20 || cropBox.h < 20) {
          if (cropStartSnapshot && cropStartSnapshot.w >= 20 && cropStartSnapshot.h >= 20) {
            cropBox = { ...cropStartSnapshot };
          } else {
            initCropBox();
          }
        }
      }
      cropDragMode = null;
      activeCropHandle = null;
      cropStartSnapshot = null;
      render();
      return;
    }

    if (currentTool === 'eraser' && isErasing) {
      isErasing = false;
      if (erasedInCurrentDrag) {
        commitHistory();
      }
      erasedInCurrentDrag = false;
      render();
      return;
    }

    if (dragMode === 'move' || dragMode === 'resize') {
      if (hasMovedOrResized) {
        commitHistory();
      }
      dragMode = null;
      activeHandle = null;
      shapeStartSnapshot = null;
      hasMovedOrResized = false;
      render();
      return;
    }

    if (!isDrawing) return;
    isDrawing = false;
    dragMode = null;

    if (dragPreviewShape) {
      let isValid = false;
      if ((dragPreviewShape.type === 'rectangle' || dragPreviewShape.type === 'ellipse' || dragPreviewShape.type === 'blur') && dragPreviewShape.w > 3 && dragPreviewShape.h > 3) {
        isValid = true;
      } else if (dragPreviewShape.type === 'arrow' || dragPreviewShape.type === 'line') {
        const length = Math.hypot(dragPreviewShape.x2 - dragPreviewShape.x1, dragPreviewShape.y2 - dragPreviewShape.y1);
        if (length > 5) {
          isValid = true;
        }
      } else if (dragPreviewShape.type === 'highlighter') {
        if (dragPreviewShape.points && dragPreviewShape.points.length >= 1) {
          isValid = true;
        }
      } else if (dragPreviewShape.type === 'step') {
        isValid = true;
      }

      if (isValid) {
        const shapeToAdd = cloneShape(dragPreviewShape);
        if (shapeToAdd.type === 'rectangle' || shapeToAdd.type === 'ellipse' || shapeToAdd.type === 'blur') {
          const norm = getNormalizedBox(shapeToAdd);
          shapeToAdd.x = norm.x;
          shapeToAdd.y = norm.y;
          shapeToAdd.w = norm.w;
          shapeToAdd.h = norm.h;
        }
        shapes.push(shapeToAdd);
        renumberSteps(shapes);
        commitHistory();
      }
    }

    dragPreviewShape = null;
    currentHighlighterPoints = [];
    render();
  }

  // Double Click Handler for editing text annotation inline or applying crop
  function onDoubleClick(e) {
    if (currentTool === 'crop' && cropBox) {
      const coords = getCanvasCoordinates(e);
      const bannerHeight = getBannerHeight();
      if (isPointInCropBox(cropBox, coords.x, coords.y - bannerHeight)) {
        applyCrop();
        return;
      }
    }

    if (currentTool !== 'select') return;
    const coords = getCanvasCoordinates(e);
    const bannerHeight = getBannerHeight();
    const px = coords.x;
    const py = coords.y - bannerHeight;

    const hitIndex = getShapeAt(px, py);
    if (hitIndex >= 0 && shapes[hitIndex].type === 'text') {
      const textShape = shapes.splice(hitIndex, 1)[0];
      selectedShapeIndex = -1;
      updateDeleteButton();
      commitHistory();
      render();

      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      const clientX = rect.left + textShape.x * scaleX;
      const clientY = rect.top + (textShape.y + bannerHeight) * scaleY;

      spawnTextInput(clientX, clientY, textShape.text, textShape.color, textShape.fontSize);
    }
  }

  // History Management
  function commitHistory() {
    undoStack.push({ shapes: cloneShapes(shapes), baseImage: baseImage });
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = []; // Clear redo stack on new action
    updateHistoryButtons();
  }

  function undo() {
    commitActiveText();
    if (undoStack.length <= 1) return;

    const current = undoStack.pop();
    redoStack.push(current);

    const prev = undoStack[undoStack.length - 1];
    shapes = cloneShapes(prev.shapes || prev);
    if (prev.baseImage) {
      baseImage = prev.baseImage;
    }
    renumberSteps(shapes);
    if (selectedShapeIndex >= shapes.length) {
      selectedShapeIndex = -1;
    }
    updateDeleteButton();
    render();
    updateHistoryButtons();
  }

  function redo() {
    commitActiveText();
    if (redoStack.length === 0) return;

    const next = redoStack.pop();
    undoStack.push(next);

    shapes = cloneShapes(next.shapes || next);
    if (next.baseImage) {
      baseImage = next.baseImage;
    }
    renumberSteps(shapes);
    if (selectedShapeIndex >= shapes.length) {
      selectedShapeIndex = -1;
    }
    updateDeleteButton();
    render();
    updateHistoryButtons();
  }

  function clearAll() {
    commitActiveText();
    if (shapes.length === 0) return;

    shapes = [];
    selectedShapeIndex = -1;
    hoveredEraserIndex = -1;
    updateDeleteButton();
    commitHistory();
    render();
    showToast('Cleared All Annotations', 'Press Ctrl+Z to undo');
  }

  function updateHistoryButtons() {
    btnUndo.disabled = undoStack.length <= 1;
    btnRedo.disabled = redoStack.length === 0;
    if (btnClear) {
      btnClear.disabled = shapes.length === 0;
    }
  }

  // Keyboard Shortcuts Handler
  function onKeyDown(e) {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // Ctrl+S: Save screenshot (works even while a slider or text input is focused)
    if (isCtrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveScreenshot();
      return;
    }

    // Escape closes the filename template popover
    if (e.key === 'Escape' && templatePanel && !templatePanel.classList.contains('hidden')) {
      e.preventDefault();
      closeTemplatePanel();
      if (templateInput) templateInput.blur();
      return;
    }

    // If typing inside an input or textarea, do not intercept keystrokes
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }

    // Crop shortcuts: Enter to Apply, Escape to Cancel
    if (currentTool === 'crop') {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCrop();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelCrop();
        return;
      }
    }

    // Delete or Backspace key: Delete selected annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isCtrlOrMeta) {
      if (selectedShapeIndex >= 0 && selectedShapeIndex < shapes.length) {
        e.preventDefault();
        deleteSelectedShape();
        return;
      }
    }

    // Arrow keys: Nudge selected annotation
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isCtrlOrMeta) {
      if (selectedShapeIndex >= 0 && selectedShapeIndex < shapes.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        const shape = shapes[selectedShapeIndex];
        applyMove(shape, cloneShape(shape), dx, dy);
        commitHistory();
        render();
        return;
      }
    }

    // Tool shortcuts: V for Select, C for Crop, E for Eraser, R for Rectangle, O for Ellipse, L for Line, A for Arrow, H for Highlighter, B for Blur, T for Text, N for Step
    if (!isCtrlOrMeta && !e.altKey && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'v') {
        setTool('select');
        return;
      } else if (key === 'c') {
        setTool('crop');
        return;
      } else if (key === 'e') {
        setTool('eraser');
        return;
      } else if (key === 'r') {
        setTool('rectangle');
        return;
      } else if (key === 'o') {
        setTool('ellipse');
        return;
      } else if (key === 'l') {
        setTool('line');
        return;
      } else if (key === 'a') {
        setTool('arrow');
        return;
      } else if (key === 'h') {
        setTool('highlighter');
        return;
      } else if (key === 'b') {
        setTool('blur');
        return;
      } else if (key === 't') {
        setTool('text');
        return;
      } else if (key === 'n') {
        setTool('step');
        return;
      }
    }

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

    // Escape: Cancel current drawing drag or deselect
    if (e.key === 'Escape') {
      if (isDrawing) {
        isDrawing = false;
        dragPreviewShape = null;
        render();
        return;
      }
      if (selectedShapeIndex >= 0) {
        selectShape(-1);
        return;
      }
    }
  }

  // Copy to Clipboard and Auto-Close
  async function copyToClipboard() {
    if (currentTool === 'crop' && cropBox) {
      applyCrop();
    }
    commitActiveText();
    const prevSelected = selectedShapeIndex;
    const prevEraserHover = hoveredEraserIndex;
    if (selectedShapeIndex >= 0) {
      selectedShapeIndex = -1;
    }
    hoveredEraserIndex = -1;
    render();

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
      if (prevSelected >= 0) {
        selectedShapeIndex = prevSelected;
      }
      hoveredEraserIndex = prevEraserHover;
      render();
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

  function updateExportControls() {
    const format = SAVE_FORMATS[saveFormat] || SAVE_FORMATS.png;
    if (qualityControl) {
      qualityControl.classList.toggle('hidden', format.mime === 'image/png');
    }
    updateTemplatePreview();
  }

  // Removes characters that browsers or file systems reject in download names
  function sanitizeFilenamePart(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      // Empty tokens can leave doubled separators behind, so squash each run
      .replace(/[_\-. ]{2,}/g, (run) => run[0])
      .replace(/^[\s._-]+|[\s._-]+$/g, '');
  }

  function getDomainToken() {
    if (!sourceUrl) return '';
    try {
      return (new URL(sourceUrl).hostname || '').replace(/^www\./i, '');
    } catch (err) {
      return '';
    }
  }

  function resolveFilenameTemplate(template, ext, width, height) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const values = {
      domain: getDomainToken(),
      title: sourceTitle || '',
      date,
      time,
      datetime: `${date}_${time}`,
      timestamp: String(now.getTime()),
      width: String(width || 0),
      height: String(height || 0),
      ext,
      format: ext,
    };

    const resolved = String(template && template.trim() ? template : DEFAULT_FILENAME_TEMPLATE)
      .replace(/\{(\w+)\}/g, (match, key) => (
        Object.prototype.hasOwnProperty.call(values, key.toLowerCase()) ? values[key.toLowerCase()] : match
      ));

    const maxBaseLength = MAX_FILENAME_LENGTH - ext.length - 1;
    let base = sanitizeFilenamePart(resolved);
    if (base.length > maxBaseLength) {
      base = sanitizeFilenamePart(base.slice(0, maxBaseLength));
    }
    return `${base || 'screenshot'}.${ext}`;
  }

  function buildExportFilename(ext, width, height) {
    return resolveFilenameTemplate(filenameTemplate, ext, width || canvas.width, height || canvas.height);
  }

  function updateTemplatePreview() {
    if (!templatePreview) return;
    const format = SAVE_FORMATS[saveFormat] || SAVE_FORMATS.png;
    templatePreview.textContent = resolveFilenameTemplate(filenameTemplate, format.ext, canvas.width, canvas.height);
  }

  function saveFilenameTemplate(value) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    try {
      const result = chrome.storage.local.set({ [FILENAME_TEMPLATE_STORAGE_KEY]: value });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (err) {
      console.error('Error saving filename template:', err);
    }
  }

  function scheduleTemplateSave() {
    if (templateSaveTimer) clearTimeout(templateSaveTimer);
    templateSaveTimer = setTimeout(() => {
      templateSaveTimer = null;
      saveFilenameTemplate(filenameTemplate);
    }, 350);
  }

  async function loadFilenameTemplate() {
    if (templateInput) {
      let stored = null;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const data = await chrome.storage.local.get([FILENAME_TEMPLATE_STORAGE_KEY]);
          stored = data ? data[FILENAME_TEMPLATE_STORAGE_KEY] : null;
        } catch (err) {
          stored = null;
        }
      }
      filenameTemplate = typeof stored === 'string' && stored.trim() ? stored.trim() : DEFAULT_FILENAME_TEMPLATE;
      templateInput.value = filenameTemplate;
    }
    updateTemplatePreview();
  }

  function openTemplatePanel() {
    if (!templatePanel) return;
    updateTemplatePreview();
    templatePanel.classList.remove('hidden');
    if (btnFilenameTemplate) btnFilenameTemplate.setAttribute('aria-expanded', 'true');
    if (templateInput) {
      templateInput.focus();
      templateInput.select();
    }
  }

  function closeTemplatePanel() {
    if (!templatePanel) return;
    templatePanel.classList.add('hidden');
    if (btnFilenameTemplate) btnFilenameTemplate.setAttribute('aria-expanded', 'false');
  }

  function insertTemplateToken(token) {
    if (!templateInput || !token) return;
    const value = templateInput.value;
    const start = typeof templateInput.selectionStart === 'number' ? templateInput.selectionStart : value.length;
    const end = typeof templateInput.selectionEnd === 'number' ? templateInput.selectionEnd : start;
    templateInput.value = value.slice(0, start) + token + value.slice(end);
    const caret = start + token.length;
    templateInput.focus();
    templateInput.setSelectionRange(caret, caret);
    filenameTemplate = templateInput.value;
    updateTemplatePreview();
    scheduleTemplateSave();
  }

  function createExportCanvas(mime) {
    // JPEG has no alpha channel, so flatten transparency onto white first
    if (mime !== 'image/jpeg') return canvas;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);
    return exportCanvas;
  }

  function canvasToBlob(targetCanvas, mime, quality) {
    return new Promise((resolve, reject) => {
      targetCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode ${mime}.`));
      }, mime, quality);
    });
  }

  // Writes a minimal single-page PDF whose page exactly holds the image, so no
  // external library (or script CSP change) is needed.
  function createPdfBlob(jpegBytes, pixelWidth, pixelHeight) {
    const encoder = new TextEncoder();
    const chunks = [];
    let byteLength = 0;

    const push = (data) => {
      const bytes = typeof data === 'string' ? encoder.encode(data) : data;
      chunks.push(bytes);
      byteLength += bytes.length;
    };

    // CSS pixels are 96 per inch, PDF points are 72 per inch
    const pointsPerPixel = 72 / 96;
    const maxPageSize = 14400; // PDF viewers reject larger pages (200 in)
    const maxSide = Math.max(pixelWidth, pixelHeight) * pointsPerPixel;
    const scale = maxSide > maxPageSize ? maxPageSize / maxSide : 1;
    const pageWidth = pixelWidth * pointsPerPixel * scale;
    const pageHeight = pixelHeight * pointsPerPixel * scale;
    const dim = (n) => (Math.round(n * 100) / 100).toString();

    const content = `q\n${dim(pageWidth)} 0 0 ${dim(pageHeight)} 0 0 cm\n/Im0 Do\nQ\n`;
    const offsets = [];

    const beginObject = (id) => {
      offsets[id] = byteLength;
      push(`${id} 0 obj\n`);
    };
    const endObject = () => push('endobj\n');

    push('%PDF-1.4\n');
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker

    beginObject(1);
    push('<< /Type /Catalog /Pages 2 0 R >>\n');
    endObject();

    beginObject(2);
    push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
    endObject();

    beginObject(3);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${dim(pageWidth)} ${dim(pageHeight)}] ` +
      `/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\n`
    );
    endObject();

    beginObject(4);
    push(`<< /Length ${encoder.encode(content).length} >>\nstream\n`);
    push(content);
    push('endstream\n');
    endObject();

    beginObject(5);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\n` +
      'stream\n'
    );
    push(jpegBytes);
    push('\nendstream\n');
    endObject();

    const xrefOffset = byteLength;
    const pad10 = (n) => String(n).padStart(10, '0');
    let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f\r\n`;
    for (let id = 1; id < offsets.length; id += 1) {
      xref += `${pad10(offsets[id])} 00000 n\r\n`;
    }
    push(xref);
    push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return new Blob(chunks, { type: 'application/pdf' });
  }

  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
      if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
        await new Promise((resolve, reject) => {
          chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
            const runtimeError = chrome.runtime.lastError;
            if (runtimeError || downloadId === undefined) {
              reject(new Error(runtimeError ? runtimeError.message : 'Download failed.'));
              return;
            }
            resolve(downloadId);
          });
        });
      } else {
        // Fallback for opening the editor outside the extension context
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } finally {
      // Keep the blob alive long enough for the browser to begin the download
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  async function saveScreenshot() {
    if (!baseImage || !btnSave || btnSave.disabled) return;

    if (currentTool === 'crop' && cropBox) {
      applyCrop();
    }
    commitActiveText();

    // Hide selection chrome so it never appears in the exported file
    const prevSelected = selectedShapeIndex;
    const prevEraserHover = hoveredEraserIndex;
    if (selectedShapeIndex >= 0) {
      selectedShapeIndex = -1;
    }
    hoveredEraserIndex = -1;
    render();

    const originalMarkup = btnSave.innerHTML;
    btnSave.disabled = true;
    btnSave.innerHTML = `
      <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Saving...</span>
    `;

    try {
      const format = SAVE_FORMATS[saveFormat] || SAVE_FORMATS.png;
      let blob;
      let exportWidth = canvas.width;
      let exportHeight = canvas.height;
      if (format.mime === 'application/pdf') {
        // PDF embeds the image as JPEG, so flatten onto white and reuse the quality slider
        const exportCanvas = createExportCanvas('image/jpeg');
        exportWidth = exportCanvas.width;
        exportHeight = exportCanvas.height;
        const jpegBlob = await canvasToBlob(exportCanvas, 'image/jpeg', saveQuality);
        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        blob = createPdfBlob(jpegBytes, exportCanvas.width, exportCanvas.height);
      } else {
        const exportCanvas = createExportCanvas(format.mime);
        exportWidth = exportCanvas.width;
        exportHeight = exportCanvas.height;
        blob = await canvasToBlob(exportCanvas, format.mime, saveQuality);
      }
      const filename = buildExportFilename(format.ext, exportWidth, exportHeight);
      await downloadBlob(blob, filename);
      showToast('Screenshot Saved!', `${filename} (${format.label})`);
    } catch (err) {
      console.error('Save error:', err);
      showToast('Save Failed', 'Could not export the screenshot. Please try again.');
    } finally {
      if (prevSelected >= 0 && prevSelected < shapes.length) {
        selectedShapeIndex = prevSelected;
      }
      hoveredEraserIndex = prevEraserHover;
      render();
      btnSave.disabled = false;
      btnSave.innerHTML = originalMarkup;
    }
  }

  function showToast(title, desc) {
    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toast.classList.remove('hidden');
  }
})();
