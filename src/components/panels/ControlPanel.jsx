const ControlPanel = ({ title, children, className = "", contentClassName = "flex flex-col md:flex-row gap-3 items-stretch md:items-center h-full" }) => (
  <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-lg flex flex-col gap-3 ${className}`}>
    <h3 className="text-sm uppercase font-bold text-gray-400 tracking-wider">{title}</h3>
    <div className={contentClassName}>
      {children}
    </div>
  </div>
);

export default ControlPanel;
