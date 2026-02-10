import ControlPanel from "./ControlPanel.jsx";
import Switch from "./Switch.jsx";

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
            onChange={(event) => setRotation(Number(event.target.value))}
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
            onChange={(event) => setBrightness(Number(event.target.value))}
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
            onChange={(event) => setContrast(Number(event.target.value))}
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
