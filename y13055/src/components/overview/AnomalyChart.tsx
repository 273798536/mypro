import { useNavigate } from 'react-router-dom'
import { useReviewStore } from '@/store/reviewStore'
import type { AnomalyType } from '@/types'

const COLORS = {
  name_mismatch: '#D9414E',
  floor_unit_mix: '#E07A3F',
  coordinate_offset: '#4F46E5',
}

const LEGEND_ITEMS = [
  { key: 'name_mismatch' as AnomalyType, label: '名称不一致', color: COLORS.name_mismatch },
  { key: 'floor_unit_mix' as AnomalyType, label: '楼层单位混写', color: COLORS.floor_unit_mix },
  { key: 'coordinate_offset' as AnomalyType, label: '坐标偏移', color: COLORS.coordinate_offset },
]

function AnomalyChart() {
  const navigate = useNavigate()
  const anomalyStats = useReviewStore((s) => s.anomalyStats())
  const setFilters = useReviewStore((s) => s.setFilters)
  const selectReview = useReviewStore((s) => s.selectReview)

  const floorData = Object.entries(anomalyStats).map(([floor, types]) => ({
    floor,
    name_mismatch: types['name_mismatch'] || 0,
    floor_unit_mix: types['floor_unit_mix'] || 0,
    coordinate_offset: types['coordinate_offset'] || 0,
  }))

  const width = 480
  const height = 320
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(
    ...floorData.map(d => d.name_mismatch + d.floor_unit_mix + d.coordinate_offset),
    1
  )

  const barWidth = 60
  const barGap = (chartWidth - barWidth * floorData.length) / (floorData.length + 1)

  const handleBarClick = (floor: string) => {
    setFilters({ floor })
    selectReview(null)
    navigate('/workbench')
  }

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.ceil((maxValue / yTicks) * i))

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold text-neutral-800 mb-6">各楼层异常分布</h2>

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
          >
            {yTickValues.map((value, i) => {
              const y = padding.top + chartHeight - (value / maxValue) * chartHeight
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-neutral-400"
                    fontSize="12"
                  >
                    {value}
                  </text>
                </g>
              )
            })}

            {floorData.map((d, floorIndex) => {
              const barX = padding.left + barGap + floorIndex * (barWidth + barGap)
              const totalHeight = d.name_mismatch + d.floor_unit_mix + d.coordinate_offset
              const scale = chartHeight / maxValue

              let currentY = padding.top + chartHeight

              const nameMismatchHeight = d.name_mismatch * scale
              const floorUnitMixHeight = d.floor_unit_mix * scale
              const coordinateOffsetHeight = d.coordinate_offset * scale

              const segments: React.ReactNode[] = []

              if (d.coordinate_offset > 0) {
                segments.push(
                  <rect
                    key="coordinate"
                    x={barX}
                    y={currentY - coordinateOffsetHeight}
                    width={barWidth}
                    height={coordinateOffsetHeight}
                    fill={COLORS.coordinate_offset}
                    rx={2}
                    className="transition-opacity hover:opacity-80"
                  />
                )
                currentY -= coordinateOffsetHeight
              }

              if (d.floor_unit_mix > 0) {
                segments.push(
                  <rect
                    key="floor"
                    x={barX}
                    y={currentY - floorUnitMixHeight}
                    width={barWidth}
                    height={floorUnitMixHeight}
                    fill={COLORS.floor_unit_mix}
                    rx={2}
                    className="transition-opacity hover:opacity-80"
                  />
                )
                currentY -= floorUnitMixHeight
              }

              if (d.name_mismatch > 0) {
                segments.push(
                  <rect
                    key="name"
                    x={barX}
                    y={currentY - nameMismatchHeight}
                    width={barWidth}
                    height={nameMismatchHeight}
                    fill={COLORS.name_mismatch}
                    rx={2}
                    className="transition-opacity hover:opacity-80"
                  />
                )
                currentY -= nameMismatchHeight
              }

              return (
                <g
                  key={d.floor}
                  onClick={() => handleBarClick(d.floor)}
                  className="cursor-pointer"
                >
                  {segments}

                  <text
                    x={barX + barWidth / 2}
                    y={padding.top + chartHeight + 24}
                    textAnchor="middle"
                    className="fill-neutral-600"
                    fontSize="14"
                    fontWeight="500"
                  >
                    {d.floor}
                  </text>
                  <text
                    x={barX + barWidth / 2}
                    y={padding.top + chartHeight - totalHeight * scale - 8}
                    textAnchor="middle"
                    className="fill-neutral-500"
                    fontSize="12"
                  >
                    {totalHeight}
                  </text>
                </g>
              )
            })}

            <text
              x={padding.left - 35}
              y={padding.top + chartHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})`}
              className="fill-neutral-500"
              fontSize="12"
            >
              异常数量
            </text>
          </svg>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <p className="text-sm text-neutral-500 mb-2">图例</p>
          {LEGEND_ITEMS.map(item => (
            <div key={item.key} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-neutral-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnomalyChart
