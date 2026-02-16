import { useCallback } from "react";

export function useProcessImage() {
  const processImage = useCallback(
    async ({
      imageSrc,
      crop,
      rotation = 0,
      brightness = 100,
      contrast = 100,
      quality = 100,
      flipHorizontal = false,
      flipVertical = false,
    }) => {
      const imageElement = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = imageSrc;
      });

      const originalWidth = imageElement.naturalWidth;
      const originalHeight = imageElement.naturalHeight;

      const rotationRadians = (rotation * Math.PI) / 180;
      const rotatedCanvas = document.createElement("canvas");
      const rotatedContext = rotatedCanvas.getContext("2d");

      rotatedCanvas.width = originalWidth;
      rotatedCanvas.height = originalHeight;
      rotatedContext.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
      `;

      rotatedContext.translate(originalWidth / 2, originalHeight / 2);
      rotatedContext.rotate(rotationRadians);
      rotatedContext.scale(
        flipHorizontal ? -1 : 1,
        flipVertical ? -1 : 1
      );

      rotatedContext.drawImage(
        imageElement,
        -originalWidth / 2,
        -originalHeight / 2
      );

      const cropX = crop?.x ?? 0;
      const cropY = crop?.y ?? 0;
      const cropWidth = crop?.width ?? originalWidth;
      const cropHeight = crop?.height ?? originalHeight;

      const croppedCanvas = document.createElement("canvas");
      const croppedContext = croppedCanvas.getContext("2d");

      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      croppedContext.drawImage(
        rotatedCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      return croppedCanvas.toDataURL("image/jpeg", quality / 100);
    },
    []
  );

  return { processImage };
}