import ControlPanel from "./ControlPanel.jsx";
import Spinner from "../Spinner.jsx";

const ExportPanel = ({
  imageSrc,
  isDownloading,
  saveImage
}) => {
  return (
    <ControlPanel title="4. Сохранение">
      <button
        onClick={saveImage}
        disabled={!imageSrc || isDownloading}
        className="bg-gradient-to-r from-[#F39416] to-[#F33716] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white transition px-4 py-2 rounded-lg w-full font-medium flex items-center justify-center"
      >
        <span className="flex items-center justify-center h-[1.5rem]">
          {isDownloading ? <Spinner /> : "Экспорт в PNG"}
        </span>
      </button>
    </ControlPanel>
  );
}

export default ExportPanel;
