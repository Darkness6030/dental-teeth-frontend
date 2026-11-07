import { loadImage } from './collageCanvas';

export async function readSourcePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Используйте JPG, PNG или WebP.');
  if (file.size > 16 * 1024 * 1024) throw new Error('Каждое фото должно быть не больше 16 МБ.');
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(src);
  if (image.naturalWidth * image.naturalHeight > 24000000)
    throw new Error('Разрешение не должно превышать 24 мегапикселя.');
  return { src, filename: file.name.slice(0, 255) };
}
export async function sourceThumbnail(photo) {
  if (!photo) return '';
  const image = await loadImage(photo.src);
  const canvas = document.createElement('canvas');
  const scale = 320 / Math.max(image.naturalWidth, image.naturalHeight);
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Convert the original without cropping; framing belongs to the photo editor.
export async function jpegSource(src, maxBytes = 16 * 1024 * 1024) {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  for (const quality of [0.94, 0.88, 0.8, 0.7]) {
    const result = canvas.toDataURL('image/jpeg', quality);
    if (((result.length - result.indexOf(',') - 1) * 3) / 4 <= maxBytes) return result;
  }
  throw new Error('Не удалось подготовить фото: файл слишком большой.');
}
