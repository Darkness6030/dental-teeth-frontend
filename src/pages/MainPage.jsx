import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectTeeth, exportImage } from "../api";
import DetectionBox from "../components/DetectionBox.jsx";
import DetectionPanel from "../components/panels/DetectionPanel.jsx";
import EditPanel from "../components/panels/EditPanel.jsx";
import ExportPanel from "../components/panels/ExportPanel.jsx";
import FileUploadPanel from "../components/panels/FileUploadPanel.jsx";
import ImageAdjustPanel from "../components/panels/ImageAdjustPanel.jsx";
import { useProcessImage } from "../hooks/useProcessImage.js";

function MainPage() {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const hintShownRef = useRef(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);

  const [jawType, setJawType] = useState("auto");
  const [detectedJawType, setDetectedJawType] = useState(null);

  const [detections, setDetections] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 1, height: 1 });

  const [fileName, setFileName] = useState(null);
  const [dragState, setDragState] = useState(null);
  const { processImage } = useProcessImage();

  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
  const [showEditHint, setShowEditHint] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      setImageSrc(src);

      const image = new Image();
      image.onload = () => {
        setOriginalSize({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });

        setCrop({
          x: 0,
          y: 0,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.src = src;
    };

    reader.readAsDataURL(file);

    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);

    setDetections([]);
    setJawType("auto");
    setDetectedJawType(null);

    setSelectedIndex(null);
    setDragState(null);
    setFileName(file.name);
  };

  const runDetection = async () => {
    if (!imageSrc) return;

    setIsLoading(true);
    setDetections([]);
    setDetectedJawType(null);

    try {
      const processedImage = await processImage({
        imageSrc,
        crop,
        rotation,
        brightness,
        contrast,
        flipHorizontal,
        flipVertical,
      });

      const result = await detectTeeth({
        image: processedImage,
        jawType,
      });

      const cropOffsetX = crop?.x ?? 0;
      const cropOffsetY = crop?.y ?? 0;

      setDetections(
        result.detections.map((detection) => {
          const x_min = detection.x_min + cropOffsetX;
          const x_max = detection.x_max + cropOffsetX;
          const y_min = detection.y_min + cropOffsetY;
          const y_max = detection.y_max + cropOffsetY;

          const label_x = (x_min + x_max) / 2;
          const label_y = y_min * 0.75 + y_max * 0.25;

          return {
            ...detection,
            x_min,
            x_max,
            y_min,
            y_max,
            label: null,
            label_x,
            label_y,
          };
        })
      );

      setJawType(result.jaw_type);
      setDetectedJawType(result.jaw_type);
    } finally {
      setIsLoading(false);
    }
  };

  const addNewDetection = () => {
    if (!originalSize.width || !originalSize.height) return;

    const boxSize = Math.min(originalSize.width, originalSize.height) * 0.2;
    const startX = (originalSize.width - boxSize) / 2;
    const startY = (originalSize.height - boxSize) / 2;

    setDetections((value) => [
      ...value,
      {
        tooth_number: "",
        x_min: startX,
        y_min: startY,
        x_max: startX + boxSize,
        y_max: startY + boxSize,
        original_width: originalSize.width,
        original_height: originalSize.height,
        label: null,
        label_x: startX + boxSize * 1.2,
        label_y: startY - boxSize * 0.3,
      },
    ]);

    setSelectedIndex(detections.length);
    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus();
    });
  };

  const deleteSelectedDetection = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex(null);
    setDetections((value) =>
      value.filter((_, index) => index !== selectedIndex)
    );
  }, [selectedIndex]);

  const updateDetection = (index, updates) => {
    setDetections((value) => {
      const next = [...value];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelectedDetection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedDetection]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event) => {
      const { type, index, startX, startY, initialDetection } = dragState;

      const scaleX = displaySize.width / originalSize.width;
      const scaleY = displaySize.height / originalSize.height;

      const deltaX = (event.clientX - startX) / scaleX;
      const deltaY = (event.clientY - startY) / scaleY;

      if (type === "MOVE") {
        updateDetection(index, {
          x_min: initialDetection.x_min + deltaX,
          y_min: initialDetection.y_min + deltaY,
          x_max: initialDetection.x_max + deltaX,
          y_max: initialDetection.y_max + deltaY,
          label_x: initialDetection.label_x + deltaX,
          label_y: initialDetection.label_y + deltaY,
        });
      }

      if (type === "RESIZE") {
        updateDetection(index, {
          x_max: initialDetection.x_max + deltaX,
          y_max: initialDetection.y_max + deltaY,
        });
      }

      if (type === "LABEL_MOVE") {
        updateDetection(index, {
          label_x: initialDetection.label_x + deltaX,
          label_y: initialDetection.label_y + deltaY,
        });
      }

      if (type === "CROP_RESIZE") {
        const { corner, initialCrop } = dragState;

        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = originalSize.width / displaySize.width;
        const scaleY = originalSize.height / displaySize.height;

        const currentX = (event.clientX - rect.left) * scaleX;
        const currentY = (event.clientY - rect.top) * scaleY;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        let x1 = initialCrop.x;
        let y1 = initialCrop.y;
        let x2 = initialCrop.x + initialCrop.width;
        let y2 = initialCrop.y + initialCrop.height;

        if (corner.includes("r")) x2 = currentX;
        if (corner.includes("l")) x1 = currentX;
        if (corner.includes("b")) y2 = currentY;
        if (corner.includes("t")) y1 = currentY;

        x1 = clamp(x1, 0, originalSize.width);
        x2 = clamp(x2, 0, originalSize.width);
        y1 = clamp(y1, 0, originalSize.height);
        y2 = clamp(y2, 0, originalSize.height);

        if (Math.abs(x2 - x1) < 10) {
          if (corner.includes("l")) x1 = x2 - 10;
          else x2 = x1 + 10;
        }

        if (Math.abs(y2 - y1) < 10) {
          if (corner.includes("t")) y1 = y2 - 10;
          else y2 = y1 + 10;
        }

        setCrop({
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        });
      }
    };

    const handlePointerUp = (event) => {
      if (dragState?.pointerId != null) {
        try {
          event.target.releasePointerCapture(dragState.pointerId);
        } catch { }
      }
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, displaySize, originalSize]);

  useEffect(() => {
    if (selectedIndex !== null && !hintShownRef.current) {
      hintShownRef.current = true;
      setShowEditHint(true);
      setTimeout(() => setShowEditHint(false), 5000);
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () =>
      setDisplaySize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [imageSrc]);

  const initiateDrag = (event, index, type) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus();
    });

    setSelectedIndex(index);
    setDragState({
      type,
      index,
      startX: event.clientX,
      startY: event.clientY,
      initialDetection: structuredClone(detections[index]),
    });
  };

  const saveImage = async () => {
    if (!imageSrc || !detectedJawType) return;

    setIsDownloading(true);
    try {
      const processedImage = await processImage({
        imageSrc,
        crop,
        rotation,
        brightness,
        contrast,
        flipHorizontal,
        flipVertical,
      });

      const result = await exportImage({
        image: processedImage,
        jawType: detectedJawType,
        detections,
      });

      const link = document.createElement("a");
      link.download = "result.png";
      link.href = result.image;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const startCropResize = (event, corner) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    setDragState({
      type: "CROP_RESIZE",
      corner,
      startX: event.clientX,
      startY: event.clientY,
      initialCrop: structuredClone(crop),
    });
  };

  return (
    <div
      className="p-4 md:p-8"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedIndex(null);
          hiddenInputRef.current?.blur();
        }
      }}
    >
      <div
        className="max-w-7xl mx-auto space-y-6"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 select-none">
          <div className="lg:col-span-12">
            <div className="lg:col-span-12">
              <FileUploadPanel
                fileName={fileName}
                handleFileChange={handleFileChange}
                fileInputRef={fileInputRef}
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="lg:col-span-4">
              <DetectionPanel
                jawType={jawType}
                setJawType={setJawType}
                runDetection={runDetection}
                imageSrc={imageSrc}
                isLoading={isLoading}
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="lg:col-span-5">
              <EditPanel
                imageSrc={imageSrc}
                addNewDetection={addNewDetection}
                selectedIndex={selectedIndex}
                deleteSelectedDetection={deleteSelectedDetection}
                isLabelMenuOpen={isLabelMenuOpen}
                setIsLabelMenuOpen={setIsLabelMenuOpen}
                updateDetection={updateDetection}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="lg:col-span-3">
              <ExportPanel
                imageSrc={imageSrc}
                detectedJawType={detectedJawType}
                isDownloading={isDownloading}
                saveImage={saveImage}
              />
            </div>
          </div>
        </div>

        {imageSrc && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-3 order-2 lg:order-1">
              <ImageAdjustPanel
                rotation={rotation}
                setRotation={setRotation}
                brightness={brightness}
                setBrightness={setBrightness}
                contrast={contrast}
                setContrast={setContrast}
                flipHorizontal={flipHorizontal}
                setFlipHorizontal={setFlipHorizontal}
                flipVertical={flipVertical}
                setFlipVertical={setFlipVertical}
              />
            </div>

            <div className="lg:col-span-9 order-1 lg:order-2">
              <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-xl overflow-visible select-none">
                <div
                  ref={containerRef}
                  className="relative w-full rounded-xl overflow-visible bg-gray-100 grid place-items-center"
                  onPointerDown={() => {
                    setSelectedIndex(null);
                  }}
                >
                  <AnimatePresence>
                    {showEditHint && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          scale: 0.95,
                          y: detectedJawType === "lower" ? -8 : 8,
                        }}
                        animate={{ opacity: 0.75, scale: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          y: detectedJawType === "lower" ? -8 : 8,
                        }}
                        transition={{ duration: 0.2 }}
                        className={`absolute z-50 pointer-events-none
                          ${detectedJawType === "lower"
                            ? "top-[20px]"
                            : "bottom-[20px]"
                          }
                    `}
                      >
                        <div className="bg-gray-900/70 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full shadow-lg border border-white/10">
                          Введите номер зуба с клавиатуры
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="w-full overflow-hidden rounded-xl">
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      className="w-full h-auto block pointer-events-none"
                      alt="Снимок зубов"
                      style={{
                        transform: `
                          rotate(${rotation}deg)
                          scaleX(${flipHorizontal ? -1 : 1})
                          scaleY(${flipVertical ? -1 : 1})
                        `,
                        transformOrigin: "center",
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                      }}
                    />
                  </div>

                  {crop &&
                    (() => {
                      const scaleX = displaySize.width / originalSize.width;
                      const scaleY = displaySize.height / originalSize.height;

                      const left = crop.x * scaleX;
                      const top = crop.y * scaleY;
                      const right = (crop.x + crop.width) * scaleX;
                      const bottom = (crop.y + crop.height) * scaleY;

                      const corners = {
                        tl: { left, top },
                        tr: { left: right, top },
                        bl: { left, top: bottom },
                        br: { left: right, top: bottom },
                      };

                      return (
                        <>
                          <div
                            className="absolute inset-0 z-[80] pointer-events-none"
                            style={{
                              backdropFilter: "blur(6px)",
                              WebkitBackdropFilter: "blur(6px)",
                              clipPath: `
                                polygon(
                                  0% 0%,
                                  100% 0%,
                                  100% 100%,
                                  0% 100%,
                                  0% 0%,
                                  ${left}px ${top}px,
                                  ${left}px ${bottom}px,
                                  ${right}px ${bottom}px,
                                  ${right}px ${top}px,
                                  ${left}px ${top}px
                                )
                              `,
                            }}
                          />

                          <div
                            className="absolute border-2 border-orange-500 z-[90] pointer-events-none"
                            style={{
                              left,
                              top,
                              width: right - left,
                              height: bottom - top,
                            }}
                          />

                          {Object.entries(corners).map(([key, pos]) => (
                            <div
                              key={key}
                              onPointerDown={(event) => startCropResize(event, key)}
                              className="absolute w-5 h-5 bg-white border-2 border-orange-500 rounded-full shadow-md hover:scale-110 active:scale-95 transition cursor-pointer z-[100] -translate-x-1/2 -translate-y-1/2"
                              style={pos}
                            />
                          ))}
                        </>
                      );
                    })()}

                  {detections.map((detection, index) => {
                    const scaleX = displaySize.width / originalSize.width;
                    const scaleY = displaySize.height / originalSize.height;

                    return (
                      <DetectionBox
                        key={index}
                        detection={detection}
                        index={index}
                        scaleX={scaleX}
                        scaleY={scaleY}
                        isSelected={selectedIndex === index}
                        initiateDrag={initiateDrag}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={hiddenInputRef}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          className="fixed opacity-0 pointer-events-none"
          onChange={(event) => {
            if (selectedIndex === null) return;
            const value = event.target.value;
            if (value.length > 2) {
              hiddenInputRef.current.value = value.slice(-1);
              updateDetection(selectedIndex, { tooth_number: value.slice(-1) });
            } else {
              updateDetection(selectedIndex, { tooth_number: value });
            }
          }}
          onBlur={() => {
            if (hiddenInputRef.current) hiddenInputRef.current.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default MainPage;
