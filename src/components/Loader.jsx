const Loader = () => {
  const containerSize = 64
  const svgSize = 56
  const padding = (containerSize - svgSize) / 2

  const strokeWidth = 6
  const radius = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = svgSize / 2

  const dashArray = circumference * 0.25
  const dashOffset = circumference * 0.75

  return (
    <div
      className="w-16 h-16 box-border"
      style={{ padding }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className="animate-spin"
        style={{ animationDuration: "1s" }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F39416"
          strokeOpacity={0.2}
          strokeWidth={strokeWidth}
        />

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F39416"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dashArray} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default Loader;