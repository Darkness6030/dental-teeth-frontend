const Switch = ({ checked, handleChange, disabled = false, label, ...props }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={handleChange}
    disabled={disabled}
    {...props}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}
  >
    <span
      aria-hidden="true"
      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

export default Switch;
