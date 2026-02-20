import { motion } from "framer-motion";

function DetectionBox({
  detection,
  index,
  scaleX,
  scaleY,
  isSelected,
  initiateDrag,
}) {
  if (!scaleX || !scaleY || !Number.isFinite(scaleX)) return null;

  const left = detection.x_min * scaleX;
  const top = detection.y_min * scaleY;
  const width = (detection.x_max - detection.x_min) * scaleX;
  const height = (detection.y_max - detection.y_min) * scaleY;

  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const labelX = detection.label_x * scaleX;
  const labelY = detection.label_y * scaleY;

  return (
    <div className="contents">
      <motion.div
        onPointerDown={(event) =>
          initiateDrag(event, index, "MOVE")
        }
        className={`absolute border-2 font-bold flex items-center justify-center rounded-lg cursor-move touch-none transition-colors
          ${
            isSelected
              ? "border-white text-[#0891B2] bg-white/25 z-20 shadow-[0_0_20px_rgba(255,255,255,0.6)]"
              : "border-white/80 text-[#0891B2] bg-white/15 z-10 hover:border-white hover:bg-white/20"
          }`}
        style={{
          left: left,
          top: top,
          width: width,
          height: height,
          transform: "none",
        }}
      >
        <span className="pointer-events-none select-none drop-shadow-md text-sm md:text-base bg-white/60 px-1 rounded backdrop-blur-sm">
          {detection.tooth_number}
        </span>

        {isSelected && (
          <div
            className="absolute bottom-[-6px] right-[-6px] w-5 h-5 bg-white border-2 border-white rounded-full cursor-nwse-resize z-30 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
            onPointerDown={(event) =>
              initiateDrag(event, index, "RESIZE")
            }
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
              stroke={isSelected ? "#FFFFFF" : "rgba(255,255,255,0.8)"}
              strokeWidth="2"
              strokeDasharray="4"
            />
          </svg>

          <motion.div
            onPointerDown={(event) =>
              initiateDrag(event, index, "LABEL_MOVE")
            }
            className="absolute px-3 py-2 rounded-2xl border touch-none border-white/80 bg-gray-400/40 backdrop-blur-md text-white flex items-center justify-center gap-2 cursor-grab active:cursor-grabbing z-30 shadow-sm leading-none"
            style={{
              left: labelX,
              top: labelY,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span className="text-base leading-none opacity-90 flex items-center">
              {detection.label.icon}
            </span>
            <span
              className="text-base font-normal whitespace-nowrap tracking-normal flex items-center"
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {detection.label.text}
            </span>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default DetectionBox;