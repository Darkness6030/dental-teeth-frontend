export function rotatedSize(width, height, degrees = 0) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle)),
    sin = Math.abs(Math.sin(angle));
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos),
  };
}
export const normalizeAngle = (degrees) => ((((degrees + 180) % 360) + 360) % 360) - 180;
export const photoFilter = (edit) =>
  `brightness(${edit.brightness ?? 100}%) contrast(${edit.contrast ?? 100}%) saturate(${edit.saturation ?? 100}%)`;
export function drawCropGrid(ctx, x, y, width, height) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = Math.max(1, width / 700);
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 2;
  ctx.beginPath();
  for (const part of [1 / 3, 2 / 3]) {
    ctx.moveTo(x + width * part, y);
    ctx.lineTo(x + width * part, y + height);
    ctx.moveTo(x, y + height * part);
    ctx.lineTo(x + width, y + height * part);
  }
  ctx.stroke();
  ctx.restore();
}
