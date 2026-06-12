import { useState } from 'react'
import { useStore } from '@/store'
import { X, ExternalLink, Info, Target } from 'lucide-react'

interface PhPoint {
  id: number
  h: number
  p: number
  label: string
  nameplate_row?: number
  formula?: string
  anomaly?: boolean
  anomaly_type?: 'symbol' | 'bad' | 'mismatch'
  description?: string
}

const points: PhPoint[] = [
  { id: 1, h: 400, p: 150, label: '1', nameplate_row: 1, formula: 'Te = -5.2°C → h1', description: '蒸发器出口（压缩机吸气）' },
  { id: 2, h: 475, p: 1600, label: '2', nameplate_row: 3, formula: 'Pe = 0.321 MPa → 等熵压缩', description: '压缩机出口（冷凝器入口）', anomaly: true, anomaly_type: 'symbol', description: '压力变化率方向写反' },
  { id: 3, h: 260, p: 1587, label: '3', nameplate_row: 4, formula: 'Pc = 1.587 MPa → Tc=42.8°C', description: '冷凝器出口（节流阀前）', anomaly: true, anomaly_type: 'mismatch', description: '备注与报警未对齐' },
  { id: 4, h: 260, p: 321, label: '4', nameplate_row: 5, formula: '等焓节流 h3 = h4', description: '节流阀出口（蒸发器入口）', anomaly: true, anomaly_type: 'bad', description: '关联压缩机功率数据异常' },
]

const curvePath = () => {
  const [p1, p2, p3, p4] = points
  return `M ${p1.h} ${p1.p} L ${p2.h} ${p2.p} L ${p3.h} ${p3.p} L ${p4.h} ${p4.p} Z`
}

export default function ChartPage() {
  const { data, setActiveTab, setHighlightedRow } = useStore()
  const [selectedPoint, setSelectedPoint] = useState<PhPoint | null>(null)

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            图表复核 / P-h CHART
          </h2>
          <p className="text-sm text-industrial-600 mt-1 font-mono">
            热泵循环压焓图 · 点击异常点回溯铭牌行与计算口径
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-industrial-600">
          <Legend color="bg-status-green" label="正常测点" />
          <Legend color="bg-warning-500" label="备注未对齐" />
          <Legend color="bg-status-red" label="符号/坏数据" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-5">
        {/* Main chart */}
        <div className="col-span-2 bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-grid-line flex items-center gap-2">
            <Target className="w-4 h-4 text-warning-500" />
            <h3 className="font-display font-bold text-white text-sm">
              压焓图 (P-h Diagram) · R134a
            </h3>
            <span className="ml-auto text-xs font-mono text-industrial-600">
              横轴 h [kJ/kg] · 纵轴 P [kPa, 对数]
            </span>
          </div>
          <div className="p-5">
            <svg viewBox="0 0 900 500" className="w-full h-[500px]">
              {/* Grid */}
              <defs>
                <pattern id="chartGrid" width="60" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 50" fill="none" stroke="rgba(30,58,95,0.4)" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="cycleFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2EC4B6" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <rect width="900" height="500" fill="url(#chartGrid)" />

              {/* Axes */}
              <line x1="80" y1="450" x2="880" y2="450" stroke="#2A4F78" strokeWidth="1.5" />
              <line x1="80" y1="30" x2="80" y2="450" stroke="#2A4F78" strokeWidth="1.5" />

              {/* Axis labels - X */}
              {[100, 200, 300, 400, 500].map((v) => (
                <g key={`x-${v}`}>
                  <line x1={80 + v * 1.5} y1="450" x2={80 + v * 1.5} y2="458" stroke="#2A4F78" />
                  <text x={80 + v * 1.5} y="475" textAnchor="middle" fill="#3D6899" fontSize="11" fontFamily="JetBrains Mono">
                    {v}
                  </text>
                </g>
              ))}
              <text x="480" y="495" textAnchor="middle" fill="#3D6899" fontSize="12" fontFamily="Space Mono">
                焓 h (kJ/kg)
              </text>

              {/* Axis labels - Y */}
              {[100, 500, 1000, 1500, 2000].map((v, i) => (
                <g key={`y-${v}`}>
                  <line x1="72" y1={450 - i * 100} x2="80" y2={450 - i * 100} stroke="#2A4F78" />
                  <text x="68" y={454 - i * 100} textAnchor="end" fill="#3D6899" fontSize="11" fontFamily="JetBrains Mono">
                    {v}
                  </text>
                </g>
              ))}
              <text x="20" y="250" textAnchor="middle" fill="#3D6899" fontSize="12" fontFamily="Space Mono" transform="rotate(-90 20 250)">
                压力 P (kPa)
              </text>

              {/* Saturation curve (simplified bell shape) */}
              <path
                d="M 180 450 Q 280 100 500 80 Q 620 150 700 450"
                fill="none"
                stroke="#2EC4B6"
                strokeWidth="1.5"
                strokeDasharray="6 3"
                opacity="0.6"
              />
              <text x="500" y="65" textAnchor="middle" fill="#2EC4B6" fontSize="10" fontFamily="JetBrains Mono" opacity="0.6">
                饱和曲线
              </text>

              {/* Cycle fill */}
              <path d={curvePath()} fill="url(#cycleFill)" />

              {/* Cycle lines */}
              <path
                d={curvePath()}
                fill="none"
                stroke="#FF6B35"
                strokeWidth="2.5"
              />

              {/* Process labels */}
              <text x="410" y="60" fill="#FF6B35" fontSize="11" fontFamily="JetBrains Mono">
                1→2: 等熵压缩
              </text>
              <text x="680" y="280" fill="#FF6B35" fontSize="11" fontFamily="JetBrains Mono">
                2→3: 等压冷凝
              </text>
              <text x="300" y="430" fill="#FF6B35" fontSize="11" fontFamily="JetBrains Mono">
                3→4: 等焓节流
              </text>
              <text x="140" y="280" fill="#FF6B35" fontSize="11" fontFamily="JetBrains Mono">
                4→1: 等压蒸发
              </text>

              {/* Data points */}
              {points.map((pt) => {
                const cx = 80 + pt.h * 1.5
                const cy = 450 - (pt.p / 2000) * 420
                const dotColor = pt.anomaly
                  ? pt.anomaly_type === 'bad'
                    ? '#E63946'
                    : '#FF6B35'
                  : '#2EC4B6'
                return (
                  <g
                    key={pt.id}
                    onClick={() => setSelectedPoint(pt)}
                    className="cursor-pointer"
                  >
                    {pt.anomaly && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="14"
                        fill="none"
                        stroke={dotColor}
                        strokeWidth="2"
                        className="anomaly-dot"
                        opacity="0.6"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="7"
                      fill={dotColor}
                      stroke="#0A1929"
                      strokeWidth="2"
                    />
                    <text
                      x={cx + 12}
                      y={cy - 8}
                      fill="white"
                      fontSize="13"
                      fontFamily="Space Mono"
                      fontWeight="bold"
                    >
                      {pt.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Point detail panel */}
        <div className="bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-grid-line flex items-center gap-2">
            <Info className="w-4 h-4 text-status-green" />
            <h3 className="font-display font-bold text-white text-sm">
              测点详情 / POINT INFO
            </h3>
          </div>
          <div className="p-5">
            {selectedPoint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl font-bold text-warning-500">
                    点 {selectedPoint.label}
                  </span>
                  {selectedPoint.anomaly && (
                    <span className={`px-2 py-1 text-xs font-mono rounded ${
                      selectedPoint.anomaly_type === 'bad'
                        ? 'bg-status-red/20 text-status-red border border-status-red/30'
                        : 'bg-warning-500/20 text-warning-500 border border-warning-500/30'
                    }`}>
                      {selectedPoint.anomaly_type === 'symbol'
                        ? '符号错误'
                        : selectedPoint.anomaly_type === 'bad'
                        ? '坏数据'
                        : '备注未对齐'}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <InfoRow label="过程描述" value={selectedPoint.description || '-'} />
                  <InfoRow label="焓值 h" value={`${selectedPoint.h} kJ/kg`} />
                  <InfoRow label="压力 P" value={`${selectedPoint.p} kPa`} />
                  {selectedPoint.formula && (
                    <InfoRow label="计算口径" value={selectedPoint.formula} mono />
                  )}
                </div>

                {selectedPoint.nameplate_row && (
                  <button
                    onClick={() => {
                      setHighlightedRow(selectedPoint.nameplate_row!)
                      setActiveTab('nameplate')
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-industrial-700 text-white rounded text-sm font-mono hover:bg-industrial-600 transition-colors border border-industrial-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                    跳转至设备铭牌行 #{selectedPoint.nameplate_row.toString().padStart(3, '0')}
                  </button>
                )}

                {selectedPoint.nameplate_row && (
                  <div className="mt-4 pt-4 border-t border-grid-line">
                    <p className="text-xs font-mono text-industrial-600 uppercase tracking-wider mb-2">
                      对应铭牌数据
                    </p>
                    {data?.nameplate
                      .filter((r) => r.row_no === selectedPoint.nameplate_row)
                      .map((row) => (
                        <div
                          key={row.row_no}
                          className={`p-3 rounded ${
                            row.bad_data_flag ? 'bg-error-stripe border border-status-red/30' : 'bg-industrial-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs text-warning-500">
                              #{row.row_no.toString().padStart(3, '0')} · {row.device_id}
                            </span>
                            <span className="font-mono text-xs text-industrial-600">{row.unit}</span>
                          </div>
                          <p className="font-mono text-sm text-white mb-1">{row.param_name}</p>
                          <p className={`font-display font-bold text-lg ${
                            row.bad_data_flag ? 'text-status-red line-through' : 'text-white'
                          }`}>
                            {row.bad_data_flag
                              ? row.param_value.toExponential(2)
                              : row.param_value.toFixed(row.param_value < 10 ? 3 : 1)}
                          </p>
                          {row.remark && (
                            <p className="font-mono text-xs text-industrial-600 mt-1">
                              备注: {row.remark}
                            </p>
                          )}
                          {row.bad_data_flag && row.bad_data_reason && (
                            <p className="font-mono text-xs text-status-red mt-1">
                              {row.bad_data_reason}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <button
                  onClick={() => setSelectedPoint(null)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-industrial-600 hover:text-white transition-colors text-sm font-mono"
                >
                  <X className="w-4 h-4" />
                  清除选择
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-industrial-600 mx-auto mb-4" />
                <p className="font-mono text-sm text-industrial-600">
                  点击图表上的测点
                </p>
                <p className="font-mono text-xs text-industrial-600/70 mt-1">
                  异常点带脉冲动画标记
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly point quick list */}
      <div className="bg-industrial-900/50 border border-grid-line rounded-lg p-5">
        <h3 className="font-display font-bold text-white text-sm mb-4">
          异常测点快速跳转
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {points.filter((p) => p.anomaly).map((pt) => (
            <button
              key={pt.id}
              onClick={() => setSelectedPoint(pt)}
              className={`p-4 rounded border text-left card-hover ${
                pt.anomaly_type === 'bad'
                  ? 'bg-status-red/10 border-status-red/30'
                  : 'bg-warning-500/10 border-warning-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-xl text-white">点 {pt.label}</span>
                <span className={`w-3 h-3 rounded-full ${
                  pt.anomaly_type === 'bad' ? 'bg-status-red' : 'bg-warning-500'
                }`} />
              </div>
              <p className="font-mono text-xs text-industrial-600">{pt.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-mono text-industrial-600 uppercase tracking-wider flex-shrink-0">
        {label}
      </span>
      <span className={`text-sm ${mono ? 'font-mono text-status-green bg-industrial-800 px-2 py-1 rounded' : 'text-white text-right'}`}>
        {value}
      </span>
    </div>
  )
}
