const ControlPanel = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-lg flex flex-col gap-3 ${className}`}>
    <h3 className="text-sm uppercase font-bold text-gray-400 tracking-wider">{title}</h3>
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center h-full">
      {children}
    </div>
  </div>
);

export default ControlPanel;
