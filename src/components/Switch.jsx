const Switch = ({ checked, handleChange, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 rounded-full
        transition-colors duration-300 ease-in-out
        ${checked ? "bg-green-500" : "bg-gray-300"}
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          absolute top-1/2 left-0 h-5 w-5 rounded-full bg-white
          -translate-y-1/2 transform
          transition-transform duration-300 ease-in-out
          ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}
        `}
      />
    </button>
  );
};

export default Switch;