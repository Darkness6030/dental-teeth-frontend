import ControlPanel from "./ControlPanel.jsx";

const ImageAdjustPanel = ({
  rotation,
  setRotation,
  brightness,
  setBrightness,
  contrast,
  setContrast
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
      </div>
    </ControlPanel>
  );
};

export default ImageAdjustPanel;
