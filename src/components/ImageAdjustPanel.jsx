import ControlPanel from "./ControlPanel.jsx";

const Switch = ({ checked, handleChange, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 rounded-full
        transition-colors duration-300 ease-in-out
        ${checked ? "bg-green-500" : "bg-gray-300"}
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute top-1/2 left-0 h-5 w-5 rounded-full bg-white
          -translate-y-1/2 transform
          transition-transform duration-300 ease-in-out
          ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}
        `}
      />
    </button>
  );
};

const ImageAdjustPanel = ({
  rotation,
  setRotation,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  flipHorizontal,
  setFlipHorizontal,
  flipVertical,
  setFlipVertical
}) => {
  return (
    <ControlPanel title="5. Коррекция изображения">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Поворот</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {rotation}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Яркость</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {brightness}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Контраст</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {contrast}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="border-t border-gray-200" />
        <div className="flex flex-col gap-4">
          <h3 className="text-sm uppercase font-bold text-gray-400 tracking-wider">Отзеркалить</h3>

          <div className="flex justify-between gap-6">
            <div className="flex flex-col items-center gap-2">
              <Switch
                checked={flipHorizontal}
                handleChange={() => setFlipHorizontal((value) => !value)}
              />
              <span className="text-sm text-gray-600 text-center">
                По горизонтали
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Switch
                checked={flipVertical}
                handleChange={() => setFlipVertical((value) => !value)}
              />
              <span className="text-sm text-gray-600 text-center">
                По вертикали
              </span>
            </div>
          </div>
        </div>

      </div>
    </ControlPanel>
  );
};

export default ImageAdjustPanel;
