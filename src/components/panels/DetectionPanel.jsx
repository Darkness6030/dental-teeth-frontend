import ControlPanel from "./ControlPanel.jsx";
import Spinner from "../Spinner.jsx";

const DetectionPanel = ({
  jawType,
  setJawType,
  runDetection,
  imageSrc,
  isLoading
}) => {
  return (
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
          {isLoading ? <Spinner /> : "Запустить"}
        </span>
      </button>
    </ControlPanel>
  );
}

export default DetectionPanel;
