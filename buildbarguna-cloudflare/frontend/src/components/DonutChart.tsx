interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerSubLabel?: string
}

export default function DonutChart({
  slices,
  size = 180,
  thickness = 36,
  centerLabel,
  centerSubLabel
}: DonutChartProps) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  let cumulative = 0
  const paths = slices.map((slice) => {
    const pct = slice.value / total
    const dashArray = `${pct * circumference} ${circumference}`
    const rotation = (cumulative / total) * 360 - 90
    cumulative += slice.value
    return { ...slice, dashArray, rotation, pct }
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={thickness}
          />
          {paths.map((p, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={thickness}
              strokeDasharray={p.dashArray}
              strokeDashoffset={0}
              style={{
                transform: `rotate(${p.rotation}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'stroke-dasharray 0.6s ease'
              }}
            />
          ))}
        </svg>
        {/* Center label */}
        {centerLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="font-bold text-gray-900 text-sm leading-tight">{centerLabel}</p>
            {centerSubLabel && <p className="text-xs text-gray-400 mt-0.5">{centerSubLabel}</p>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <span>{p.label}</span>
            <span className="text-gray-400">({(p.pct * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
