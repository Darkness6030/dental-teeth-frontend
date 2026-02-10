import ControlPanel from "./ControlPanel.jsx";

const FileUploadPanel = ({ fileName, handleFileChange, fileInputRef }) => {
  return (
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
  );
}

export default FileUploadPanel;
