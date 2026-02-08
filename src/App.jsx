import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { detectTeeth, exportImage } from "./api";
import Logo from "./assets/logo.svg";
import ControlPanel from "./components/ControlPanel.jsx";
import Spinner from "./components/Spinner.jsx";

const LABEL_OPTIONS = [
  { id: "caries", text: "Кариес", icon: "🦷" },
  { id: "pulpitis", text: "Пульпит", icon: "🔴" },
  { id: "periodontitis", text: "Периодонтит", icon: "⚠️" },
  { id: "crack", text: "Трещина", icon: "⚡" },
  { id: "extraction", text: "Удаление", icon: "✖️" },
  { id: "implant", text: "Имплант", icon: "🔩" },
  { id: "crown", text: "Коронка", icon: "👑" }
];

function App() {
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const hintShownRef = useRef(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [jawType, setJawType] = useState("auto");
  const [detectedJawType, setDetectedJawType] = useState(null);

  const [detections, setDetections] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 1, height: 1 });

  const [fileName, setFileName] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
  const [showEditHint, setShowEditHint] = useState(false);

  const [dragState, setDragState] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      setImageSrc(src);

      const image = new Image();
      image.onload = () =>
        setOriginalSize({
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      image.src = src;
    };

    reader.readAsDataURL(file);

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
      const result = await detectTeeth({ image: imageSrc, jawType });

      setDetections(
        result.detections.map((detection) => {
          const center_x = (detection.x_min + detection.x_max) / 2;
          const center_y = (detection.y_min + detection.y_max) / 2;
          const width = detection.x_max - detection.x_min;
          const height = detection.y_max - detection.y_min;

          return {
            ...detection,
            label: null,
            label_x: center_x + width * 0.6,
            label_y: center_y - height * 0.6
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
        label_y: startY - boxSize * 0.3
      }
    ]);

    setSelectedIndex(detections.length);
    requestAnimationFrame(() => {
      hiddenInputRef.current?.focus();
    });
  };

  const deleteSelectedDetection = useCallback(() => {
    if (selectedIndex === null) return;
    setDetections((value) => value.filter((_, index) => index !== selectedIndex));
    setSelectedIndex(null);
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
          y_max: initialDetection.y_max + deltaY
        });
      }

      if (type === "LABEL_MOVE") {
        updateDetection(index, {
          label_x: initialDetection.label_x + deltaX,
          label_y: initialDetection.label_y + deltaY
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
        height: containerRef.current.clientHeight
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
      initialDetection: structuredClone(detections[index])
    });
  };

  const saveImage = async () => {
    if (!imageSrc || !detectedJawType) return;

    setIsDownloading(true);
    try {
      const result = await exportImage({
        image: imageSrc,
        jawType: detectedJawType,
        detections
      });

      const link = document.createElement("a");
      link.download = "result.png";
      link.href = result.image;
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 p-4 md:p-8"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedIndex(null);
          hiddenInputRef.current?.blur();
        }
      }}

    >
      <div className="max-w-7xl mx-auto space-y-6" onPointerDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <img src={Logo} alt="Dental Daily Logo" className="h-12 w-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 select-none">
          <div className="lg:col-span-12">
            <ControlPanel title="1. Загрузка изображения">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex w-full md:w-auto md:flex-grow">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-[#F39416] to-[#F33716] hover:opacity-90 text-white rounded-l-lg rounded-r-none px-4 py-2 transition whitespace-nowrap font-medium"
                  >
                    Выбрать файл
                  </button>
                  <div className="flex-grow bg-gray-100 rounded-r-lg rounded-l-none border border-gray-200 border-l-0 text-gray-600 px-3 py-2 flex items-center truncate">
                    {fileName || "Файл не выбран"}
                  </div>
                </div>
              </div>
            </ControlPanel>
          </div>

          <div className="lg:col-span-4">
            <ControlPanel title="2. Распознавание">
              <select
                value={jawType}
                onChange={(event) => setJawType(event.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F39416]/50 flex-grow"
              >
                <option value="auto">Автоматически</option>
                <option value="upper">Верхняя челюсть</option>
                <option value="lower">Нижняя челюсть</option>
              </select>
              <button
                onClick={runDetection}
                disabled={!imageSrc || isLoading}
                className="bg-gradient-to-r from-[#F39416] to-[#F33716] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition px-4 py-2 rounded-lg text-white font-medium flex-grow md:flex-grow-0 whitespace-nowrap flex items-center justify-center min-w-[110px]"
              >
                <span className="flex items-center justify-center h-[1.5rem]">
                  {isLoading ? <Spinner /> : "Запустить ИИ"}
                </span>
              </button>
            </ControlPanel>
          </div>

          <div className="lg:col-span-5">
            <ControlPanel title="3. Редактирование">
              <button
                onClick={addNewDetection}
                disabled={!imageSrc}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 transition px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2 font-medium"
              >
                Добавить
              </button>
              <div className="relative flex-1">
                <button
                  disabled={selectedIndex === null}
                  onClick={() => {
                    if (selectedIndex === null) return;
                    setIsLabelMenuOpen((value) => !value);
                  }}
                  className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition px-4 py-2 rounded-lg w-full font-medium flex items-center justify-center gap-2"
                >
                  Метка
                </button>
                {selectedIndex !== null && isLabelMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] flex flex-col p-2">
                    {LABEL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          updateDetection(selectedIndex, { label: option });
                          setIsLabelMenuOpen(false);
                        }}
                        className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg text-sm transition-colors text-left"
                      >
                        <span>{option.icon}</span>
                        <span>{option.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={deleteSelectedDetection}
                disabled={selectedIndex === null}
                className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition px-4 py-2 rounded-lg flex-1 font-medium"
              >
                Удалить
              </button>
            </ControlPanel>
          </div>

          <div className="lg:col-span-3">
            <ControlPanel title="4. Сохранение">
              <button
                onClick={saveImage}
                disabled={!imageSrc || !detectedJawType || isDownloading}
                className="bg-gradient-to-r from-[#F39416] to-[#F33716] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition px-4 py-2 rounded-lg w-full font-medium flex items-center justify-center"
              >
                <span className="flex items-center justify-center h-[1.5rem]">
                  {isDownloading ? <Spinner /> : "Экспортировать PNG"}
                </span>
              </button>
            </ControlPanel>
          </div>
        </div>

        {imageSrc && (
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-xl overflow-hidden select-none">
            <div
              ref={containerRef}
              className="relative w-full rounded-xl overflow-hidden bg-gray-100 grid place-items-center"
            >
              <AnimatePresence>
                {showEditHint && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: detectedJawType === "lower" ? -8 : 8 }}
                    animate={{ opacity: 0.75, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: detectedJawType === "lower" ? -8 : 8 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute z-50 pointer-events-none
                      ${detectedJawType === "lower" ? "top-[20px]" : "bottom-[20px]"}
                    `}
                  >
                    <div className="bg-gray-900/70 backdrop-blur-md text-white text-sm px-4 py-2 rounded-full shadow-lg border border-white/10">
                      Введите номер зуба с клавиатуры
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <img
                ref={imageRef}
                src={imageSrc}
                className="w-full pointer-events-none block"
                alt="Снимок зубов"
              />

              {detections.map((detection, index) => {
                const scaleX = displaySize.width / originalSize.width;
                const scaleY = displaySize.height / originalSize.height;
                if (!scaleX || !scaleY || !Number.isFinite(scaleX)) return null;

                const x = detection.x_min * scaleX;
                const y = detection.y_min * scaleY;
                const w = (detection.x_max - detection.x_min) * scaleX;
                const h = (detection.y_max - detection.y_min) * scaleY;
                const isSelected = selectedIndex === index;

                const centerX = x + w / 2;
                const centerY = y + h / 2;
                const labelX = detection.label_x * scaleX;
                const labelY = detection.label_y * scaleY;

                return (
                  <div key={index} className="contents">
                    <motion.div
                      onPointerDown={(event) => initiateDrag(event, index, "MOVE")}
                      className={`absolute border-2 font-bold flex items-center justify-center rounded-lg cursor-move touch-none transition-colors
                        ${isSelected
                          ? "border-[#22D3EE] text-[#0891B2] bg-[#22D3EE]/35 z-20 shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                          : "border-[#67E8F9] text-[#0891B2] bg-[#67E8F9]/25 z-10 hover:border-[#22D3EE] hover:bg-[#22D3EE]/25"
                        }`}
                      style={{ left: x, top: y, width: w, height: h, transform: "none" }}
                    >
                      <span className="pointer-events-none select-none drop-shadow-md text-sm md:text-base bg-white/60 px-1 rounded backdrop-blur-sm">
                        {detection.tooth_number}
                      </span>
                      {isSelected && (
                        <div
                          className="absolute bottom-[-6px] right-[-6px] w-5 h-5 bg-white border-2 border-[#22D3EE] rounded-full cursor-nwse-resize z-30 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                          onPointerDown={(event) => initiateDrag(event, index, "RESIZE")}
                        />
                      )}
                    </motion.div>

                    {detection.label && (
                      <>
                        <svg className="absolute inset-0 pointer-events-none w-full h-full z-[5]">
                          <line
                            x1={centerX}
                            y1={centerY}
                            x2={labelX}
                            y2={labelY}
                            stroke={isSelected ? "#22D3EE" : "#67E8F9"}
                            strokeWidth="2"
                            strokeDasharray="4"
                          />
                        </svg>
                        <motion.div
                          onPointerDown={(event) => initiateDrag(event, index, "LABEL_MOVE")}
                          className="absolute px-3 py-2 rounded-2xl border touch-none border-white/80 bg-gray-400/40 backdrop-blur-md text-white flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing z-30 shadow-sm leading-none"
                          style={{ left: labelX, top: labelY, transform: "translate(-50%, -50%)" }}
                        >
                          <span className="text-base leading-none opacity-90 flex items-center">
                            {detection.label.icon}
                          </span>
                          <span
                            className="text-base font-normal whitespace-nowrap tracking-normal flex items-center"
                            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                          >
                            {detection.label.text}
                          </span>
                        </motion.div>

                      </>
                    )}
                  </div>
                );
              })}
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
          onBlur={() => { if (hiddenInputRef.current) hiddenInputRef.current.value = ""; }}
        />
      </div>
    </div>
  );
}

export default App;