import ControlPanel from "./ControlPanel.jsx";

const LABEL_OPTIONS = [
  { id: "caries", text: "Кариес", icon: "🦷" },
  { id: "pulpitis", text: "Пульпит", icon: "🔴" },
  { id: "periodontitis", text: "Периодонтит", icon: "⚠️" },
  { id: "crack", text: "Трещина", icon: "⚡" },
  { id: "extraction", text: "Удаление", icon: "✖️" },
  { id: "implant", text: "Имплант", icon: "🔩" },
  { id: "crown", text: "Коронка", icon: "👑" }
];

const EditPanel = ({
  imageSrc,
  addNewDetection,
  selectedIndex,
  deleteSelectedDetection,
  isLabelMenuOpen,
  setIsLabelMenuOpen,
  updateDetection
}) => {
  return (
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
  );
}

export default EditPanel;
