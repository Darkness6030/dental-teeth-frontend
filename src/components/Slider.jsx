function Slider({
  value,
  min,
  max,
  step = 1,
  onChange
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative w-full">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider w-full"
        style={{
          background: `linear-gradient(to right, #F33716 0%, #F39416 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`
        }}
      />
    </div>
  );
}

export default Slider;