import { useCallback } from "react";

export function useProcessImage() {
  const processImage = useCallback(
    async ({ imageSrc, rotation = 0, brightness = 100, contrast = 100, crop }) => {
      const image = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = imageSrc;
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const radians = (rotation * Math.PI) / 180;

      const cropX = crop?.x ?? 0;
      const cropY = crop?.y ?? 0;
      const cropWidth = crop?.width ?? image.naturalWidth;
      const cropHeight = crop?.height ?? image.naturalHeight;

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      context.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
      `;

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(radians);
      context.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        -cropWidth / 2,
        -cropHeight / 2,
        cropWidth,
        cropHeight
      );

      return canvas.toDataURL("image/png");
    },
    []
  );

  return { processImage };
}
