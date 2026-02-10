import Slider from "../Slider.jsx";
import Switch from "../Switch.jsx";
import ControlPanel from "./ControlPanel.jsx";

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
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Поворот</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {rotation}°
            </span>
          </div>
          <Slider
            min={-180}
            max={180}
            value={rotation}
            onChange={setRotation}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Яркость</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {brightness}%
            </span>
          </div>
          <Slider
            min={0}
            max={200}
            value={brightness}
            onChange={setBrightness}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Контраст</span>
            <span className="text-sm text-gray-600 tabular-nums">
              {contrast}%
            </span>
          </div>
          <Slider
            min={0}
            max={200}
            value={contrast}
            onChange={setContrast}
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
