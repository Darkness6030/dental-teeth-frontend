import { useEffect, useState } from "react";
import { getLabelTypes } from "../../api";
import ControlPanel from "./ControlPanel.jsx";

const EditPanel = ({
  imageSrc,
  addNewDetection,
  selectedIndex,
  deleteSelectedDetection,
  isLabelMenuOpen,
  setIsLabelMenuOpen,
  updateDetection
}) => {
  const [labelTypes, setLabelTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    getLabelTypes().then((labels) => {
      if (active) setLabelTypes(labels);
    }).catch(() => {
      if (active) setError("Не удалось загрузить метки");
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  const options = [{ id: "none", text: "Ничего", icon: "🚫" }, ...labelTypes];

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
          <div className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl z-[100] flex flex-col p-2">
            {isLoading && <p className="p-2 text-sm text-gray-500">Загрузка...</p>}
            {error && (
              <div role="alert" className="p-2 text-sm text-red-600">
                {error}
                <button className="ml-2 underline" onClick={() => {
                  setError("");
                  setIsLoading(true);
                  setRetry((value) => value + 1);
                }}>Повторить</button>
              </div>
            )}
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  updateDetection(
                    selectedIndex,
                    { label: option.id === "none" ? null : option }
                  );
                  setIsLabelMenuOpen(false);
                }}
                className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg text-sm transition-colors text-left"
              >
                <span>{option.icon}</span>
                <span className="min-w-0 break-words">{option.text}</span>
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