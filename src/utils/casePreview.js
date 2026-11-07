import { drawCollage, collageThumbnail, loadImage, loadCollageFont } from './collageCanvas';
import { renderCasePhoto } from './prodoctor';

// Older cases have small thumbnails; render a sharp preview from their saved originals.
export async function renderSavedCasePreview(state) {
  if (state.mode === 'prodoctor')
    return state.photos?.[0]
      ? collageThumbnail(await renderCasePhoto(state.photos[0], 1024))
      : null;
  if (!state.before || !state.after || !state.matrices || !state.adjustments) return null;
  const [before, after] = await Promise.all([
    loadImage(state.before),
    loadImage(state.after),
    loadCollageFont(),
  ]);
  const canvas = document.createElement('canvas');
  drawCollage(canvas, { before, after }, state.matrices, state.adjustments, state.settings);
  return collageThumbnail(canvas);
}
