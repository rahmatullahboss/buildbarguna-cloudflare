interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  formatValue?: (v: number) => string
  title?: string
}

export default function BarChart({
  data,
  height = 120,
  formatValue = (v) => String(v),
  title
}: BarChartProps) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div>
      {title && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>}
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {formatValue(d.value)}
              </div>
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  backgroundColor: d.color ?? '#6366f1',
                  minHeight: d.value > 0 ? 4 : 0
                }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-gray-400 truncate">{d.label}</div>
        ))}
      </div>
    </div>
  )
}
