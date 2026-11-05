import fontUrl from '../assets/InterRegular.ttf';

export const DEFAULT_ADJUSTMENT = { zoom: 100, x: 0, y: 0, rotation: 0, brightness: 100 };
export const DEFAULT_EXPORT = { width: 1388, height: 1112, format: 'webp', quality: 92, split: 50 };

export function normalizeExportSettings(settings) {
  const merged = { ...DEFAULT_EXPORT, ...settings };
  if (!['png', 'jpg', 'webp'].includes(merged.format)) merged.format = DEFAULT_EXPORT.format;
  for (const key of ['width', 'height', 'quality', 'split']) {
    if (!Number.isFinite(merged[key])) merged[key] = DEFAULT_EXPORT[key];
  }
  return merged;
}

let fontPromise;
export function loadCollageFont() {
  if (!fontPromise) {
    fontPromise = new FontFace('CollageInter', `url(${fontUrl})`)
      .load()
      .then((font) => document.fonts.add(font));
  }
  return fontPromise;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось открыть фото.'));
    image.src = src;
  });
}

export function photoRotation(matrix, manualRotation = 0) {
  return (Math.atan2(matrix[1][0], matrix[0][0]) * 180) / Math.PI + manualRotation;
}

// Apply manual tilt around the aligned frame centre, after automatic alignment.
function rotatedPhotoMatrix(matrix, degrees = 0) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const [[a, c, tx], [b, d, ty]] = matrix;
  return [
    [cos * a - sin * b, cos * c - sin * d, 650 + cos * (tx - 650) - sin * (ty - 478)],
    [sin * a + cos * b, sin * c + cos * d, 478 + sin * (tx - 650) + cos * (ty - 478)],
  ];
}

// Keep the visible part covered. A photo may extend beyond the divider;
// its hidden part does not restrict panning.
// Work in source coordinates so rotated corners, not just bounding boxes, stay covered.
export function fitPhotoAdjustment(photo, matrix, edit, split, key, fullFrame = false) {
  const width = photo.naturalWidth || photo.width;
  const height = photo.naturalHeight || photo.height;
  const [[a, c, tx], [b, d, ty]] = rotatedPhotoMatrix(matrix, edit.rotation);
  const determinant = a * d - b * c;
  const inverse = (x, y) => [(d * x - c * y) / determinant, (-b * x + a * y) / determinant];
  const divider = (1300 * split) / 100;
  const left = fullFrame || key === 'before' ? 0 : divider;
  const right = fullFrame || key === 'after' ? 1300 : divider;
  const corners = [
    [left, 0],
    [right, 0],
    [left, 956],
    [right, 956],
  ];
  const relative = corners.map(([x, y]) => inverse(x - 650, y - 478));
  const extent = (points, axis) => [
    Math.min(...points.map((p) => p[axis])),
    Math.max(...points.map((p) => p[axis])),
  ];
  const [minX, maxX] = extent(relative, 0),
    [minY, maxY] = extent(relative, 1);
  const margin = Math.min(2, width / 100, height / 100);
  const minimum = Math.max(
    (maxX - minX) / (width - 2 * margin),
    (maxY - minY) / (height - 2 * margin),
  );
  const zoom = Math.max(edit.zoom / 100, minimum);
  const offsetX = edit.x * 13,
    offsetY = edit.y * 9.56;
  const origin = inverse(650 - tx - offsetX / zoom, 478 - ty - offsetY / zoom);
  const source = relative.map(([x, y]) => [origin[0] + x / zoom, origin[1] + y / zoom]);
  const [x1, x2] = extent(source, 0),
    [y1, y2] = extent(source, 1);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const dx = clamp(0, margin - x1, width - margin - x2);
  const dy = clamp(0, margin - y1, height - margin - y2);
  return {
    zoom: zoom * 100,
    x: (offsetX - zoom * (a * dx + c * dy)) / 13,
    y: (offsetY - zoom * (b * dx + d * dy)) / 9.56,
    rotation: edit.rotation ?? 0,
    brightness: edit.brightness,
  };
}

export function fitCollageAdjustments(
  photos,
  matrices,
  edits,
  split,
  sharedZoom = false,
  fullFrame = false,
) {
  let fitted = Object.fromEntries(
    ['before', 'after'].map((key) => [
      key,
      fitPhotoAdjustment(photos[key], matrices[key], edits[key], split, key, fullFrame),
    ]),
  );
  if (sharedZoom) {
    const zoom = Math.max(fitted.before.zoom, fitted.after.zoom);
    fitted = Object.fromEntries(
      ['before', 'after'].map((key) => [
        key,
        fitPhotoAdjustment(
          photos[key],
          matrices[key],
          { ...edits[key], zoom },
          split,
          key,
          fullFrame,
        ),
      ]),
    );
  }
  return fitted;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
}

function drawPhoto(ctx, frame, photo, matrix, edit) {
  ctx.save();
  const cover = Math.max(frame.width / 1300, frame.height / 956);
  ctx.translate(frame.x, frame.y);
  ctx.translate(frame.width / 2 + edit.x * 13 * cover, frame.height / 2 + edit.y * 9.56 * cover);
  ctx.scale(edit.zoom / 100, edit.zoom / 100);
  ctx.translate(-frame.width / 2, -frame.height / 2);
  ctx.translate((frame.width - 1300 * cover) / 2, (frame.height - 956 * cover) / 2);
  ctx.scale(cover, cover);
  const rotated = rotatedPhotoMatrix(matrix, edit.rotation);
  ctx.transform(
    rotated[0][0],
    rotated[1][0],
    rotated[0][1],
    rotated[1][1],
    rotated[0][2],
    rotated[1][2],
  );
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = `brightness(${edit.brightness}%)`;
  ctx.drawImage(photo, 0, 0);
  ctx.restore();
}

/** Shared renderer for the live preview and the exported image. No CSS transforms in exports. */
export function drawCollage(
  canvas,
  photos,
  matrices,
  adjustments,
  settings,
  preview = false,
  selected = null,
) {
  settings = normalizeExportSettings(settings);
  const ratio = preview ? Math.min(1, 1600 / Math.max(settings.width, settings.height)) : 1;
  canvas.width = Math.round(settings.width * ratio);
  canvas.height = Math.round(settings.height * ratio);
  const ctx = canvas.getContext('2d');
  const width = canvas.width,
    height = canvas.height;
  const scale = Math.min(width / 1388, height / 1112);
  const frame = {
    x: (width * 40) / 1388,
    y: (height * 78) / 1112,
    width: (width * 1300) / 1388,
    height: (height * 956) / 1112,
  };
  const divider = (frame.width * settings.split) / 100;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  roundedRect(ctx, frame.x, frame.y, frame.width, frame.height, 100 * scale);
  ctx.clip();
  ctx.fillStyle = 'white';
  ctx.fillRect(frame.x, frame.y, frame.width, frame.height);

  for (const key of ['before', 'after']) {
    const edit = adjustments[key];
    const matrix = matrices[key];
    ctx.save();
    ctx.beginPath();
    const left = key === 'before' ? 0 : divider;
    const layerWidth = key === 'before' ? divider : frame.width - divider;
    ctx.rect(frame.x + left, frame.y, layerWidth, frame.height);
    ctx.clip();
    drawPhoto(ctx, frame, photos[key], matrix, edit);
    ctx.restore();
  }
  ctx.fillStyle = 'white';
  ctx.fillRect(frame.x + divider - 8 * scale, frame.y, 16 * scale, frame.height);
  ctx.restore();

  if (preview) {
    ctx.save();
    roundedRect(ctx, frame.x, frame.y, frame.width, frame.height, 100 * scale);
    ctx.strokeStyle = '#bfc6d0';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.restore();
    if (selected) {
      ctx.save();
      ctx.beginPath();
      const left = selected === 'before' ? 0 : divider;
      const width = selected === 'before' ? divider : frame.width - divider;
      ctx.rect(frame.x + left, frame.y, width, frame.height);
      ctx.clip();
      roundedRect(ctx, frame.x, frame.y, frame.width, frame.height, 100 * scale);
      ctx.strokeStyle = '#607fa8';
      ctx.lineWidth = 5 * scale;
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.font = `${50 * scale}px CollageInter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelWidth = 276 * scale,
    labelHeight = 156 * scale;
  for (const [key, text, color] of [
    ['before', 'До', '#8e8386'],
    ['after', 'После', '#a68c89'],
  ]) {
    const x =
      key === 'before' ? frame.x + 36 * scale : frame.x + frame.width - 34 * scale - labelWidth;
    const y = frame.y + 34 * scale;
    ctx.fillStyle = color;
    roundedRect(ctx, x, y, labelWidth, labelHeight, 78 * scale);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText(text, x + labelWidth / 2, y + labelHeight / 2);
  }
  const handleX = frame.x + divider;
  const handleY = frame.y + frame.height - 124 * scale;
  ctx.fillStyle = 'white';
  roundedRect(
    ctx,
    handleX - 122 * scale,
    handleY - 88 * scale,
    244 * scale,
    176 * scale,
    88 * scale,
  );
  ctx.fill();
  ctx.fillStyle = '#19191e';
  for (const direction of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(handleX + direction * 34 * scale, handleY);
    ctx.lineTo(handleX + direction * 12 * scale, handleY - 24 * scale);
    ctx.lineTo(handleX + direction * 12 * scale, handleY + 24 * scale);
    ctx.closePath();
    ctx.fill();
  }
}

export async function exportCollage(photos, matrices, adjustments, settings) {
  const canvas = document.createElement('canvas');
  drawCollage(canvas, photos, matrices, adjustments, settings);
  return encodeCanvas(canvas, settings);
}

async function encodeCanvas(canvas, settings) {
  settings = normalizeExportSettings(settings);
  const type = settings.format === 'jpg' ? 'image/jpeg' : `image/${settings.format}`;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, settings.quality / 100));
  if (!blob || blob.type !== type)
    throw new Error('Браузер не поддерживает выбранный формат. Выберите PNG или JPG.');
  return blob;
}

export function collageThumbnail(canvas) {
  const preview = document.createElement('canvas');
  const ratio = Math.min(1, 320 / Math.max(canvas.width, canvas.height));
  preview.width = Math.round(canvas.width * ratio);
  preview.height = Math.round(canvas.height * ratio);
  preview.getContext('2d').drawImage(canvas, 0, 0, preview.width, preview.height);
  return preview.toDataURL('image/jpeg', 0.75);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
