import { loadImage, downloadBlob } from './collageCanvas';
import { zipImages } from './zipImages';
import { rotatedSize, photoFilter } from './photoGeometry';

export const textLength = (text) => Array.from(text.replace(/\s/gu, '')).length;
export function adaptDescription(text) {
  let count = 0,
    result = '';
  for (const char of text) {
    if (!/\s/u.test(char) && ++count > 500) break;
    result += char;
  }
  return result;
}

export async function readCasePhoto(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type))
    throw new Error('Для ПроДокторов используйте JPG или PNG.');
  if (file.size > 16 * 1024 * 1024) throw new Error('Каждое фото должно быть не больше 16 МБ.');
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(src);
  if (image.naturalWidth * image.naturalHeight > 24000000)
    throw new Error('Разрешение фото не должно превышать 24 мегапикселя.');
  return { src, filename: file.name.slice(0, 255), stage: 'before', zoom: 100, x: 50, y: 50 };
}

export async function renderCasePhoto(photo, size = 1200) {
  const image = await loadImage(photo.src);
  const bounds = rotatedSize(image.naturalWidth, image.naturalHeight, photo.rotation || 0);
  const side = (Math.min(bounds.width, bounds.height) * 100) / photo.zoom;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.save();
  ctx.scale(size / side, size / side);
  ctx.translate(
    (-(bounds.width - side) * photo.x) / 100,
    (-(bounds.height - side) * photo.y) / 100,
  );
  ctx.translate(bounds.width / 2, bounds.height / 2);
  ctx.rotate(((photo.rotation || 0) * Math.PI) / 180);
  ctx.scale(photo.flipped ? -1 : 1, 1);
  ctx.filter = photoFilter(photo);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();
  return canvas;
}

async function casePhotoFile(photo, name, index) {
  const canvas = await renderCasePhoto(photo);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
  if (!blob || blob.size > 16 * 1024 * 1024)
    throw new Error('Не удалось подготовить фото до 16 МБ.');
  return {
    blob,
    name: `${name.replace(/[/\\:*?"<>|]/g, '-') || 'case'}-${index + 1}-${photo.stage}.jpg`,
  };
}

export async function downloadCasePhoto(photo, name, index) {
  const file = await casePhotoFile(photo, name, index);
  downloadBlob(file.blob, file.name);
}

export async function downloadAllCasePhotos(photos, name) {
  // Render sequentially to avoid keeping six full canvases in memory at once.
  const files = [];
  for (const [index, photo] of photos.entries())
    files.push(await casePhotoFile(photo, name, index));
  const archive = await zipImages(files);
  downloadBlob(archive, `${name.replace(/[/\\:*?"<>|]/g, '-') || 'case'}-photos.zip`);
}
