import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, TrendingDown, Heart, Building2, BarChart3, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useState } from 'react'

function ScoreRadar({ scores }: { scores: { label: string; value: number; max: number }[] }) {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const r = 75
  const n = scores.length
  const angleStep = (2 * Math.PI) / n

  const points = scores.map((s, i) => {
    const angle = angleStep * i - Math.PI / 2
    const ratio = s.value / s.max
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) }
  })

  const gridPoints = [0.25, 0.5, 0.75, 1].map(level =>
    scores.map((_, i) => {
      const angle = angleStep * i - Math.PI / 2
      return { x: cx + r * level * Math.cos(angle), y: cy + r * level * Math.sin(angle) }
    })
  )

  const axisPoints = scores.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridPoints.map((grid, gi) => (
        <path key={gi} d={toPath(grid)} fill="none" stroke="#3A506B" strokeWidth="0.5" opacity={0.4} />
      ))}
      {axisPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#3A506B" strokeWidth="0.5" opacity={0.3} />
      ))}
      <motion.path
        d={toPath(points)}
        fill="rgba(212,168,67,0.15)"
        stroke="#D4A843"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="3"
          fill="#D4A843"
          initial={{ r: 0 }}
          animate={{ r: 3 }}
          transition={{ delay: 0.3 + i * 0.1 }}
        />
      ))}
      {scores.map((s, i) => {
        const angle = angleStep * i - Math.PI / 2
        const lx = cx + (r + 18) * Math.cos(angle)
        const ly = cy + (r + 18) * Math.sin(angle)
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="10">
            {s.label}
          </text>
        )
      })}
    </svg>
  )
}

export default function Settlement() {
  const settlement = useGameStore(s => s.settlement)
  const debt = useGameStore(s => s.debt)
  const config = useGameStore(s => s.config)
  const turns = useGameStore(s => s.turns)
  const navigate = useNavigate()
  const [expandedDeduction, setExpandedDeduction] = useState<number | null>(null)

  if (!settlement) {
    return (
      <div className="min-h-screen bg-[#0D1B1E] flex items-center justify-center">
        <p className="text-slate-500">暂无结算数据</p>
      </div>
    )
  }

  const scores = [
    { label: '债务健康', value: settlement.debtHealthScore, max: 40 },
    { label: '满意度', value: settlement.satisfactionScore, max: 30 },
    { label: '项目收益', value: settlement.projectScore, max: 20 },
    { label: '运营效率', value: settlement.efficiencyScore, max: 10 },
  ]

  const debtRatio = ((debt / config.initialDebt) * 100).toFixed(0)
  const lastTurn = turns[turns.length - 1]

  return (
    <div className="min-h-screen bg-[#0D1B1E] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Award className="w-12 h-12 text-[#D4A843] mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-[#D4A843] mb-1" style={{ fontFamily: '"Noto Serif SC", serif' }}>经营结算</h1>
          <p className="text-slate-500 text-sm">回合数 {turns.length} | 最终债务 {debt.toFixed(0)}万（初始{config.initialDebt}万的{debtRatio}%）</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1B2838] rounded-xl p-6 border border-[#3A506B]/20 flex flex-col items-center"
          >
            <div className="text-slate-500 text-xs mb-2">经营评分</div>
            <motion.div
              className="text-5xl font-bold text-[#D4A843] font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {settlement.totalScore.toFixed(1)}
            </motion.div>
            <div className="text-slate-600 text-xs mt-1">满分 100</div>
            <div className="mt-4">
              <ScoreRadar scores={scores} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1B2838] rounded-xl p-6 border border-[#3A506B]/20"
          >
            <h3 className="text-[#D4A843] text-sm font-semibold mb-4" style={{ fontFamily: '"Noto Serif SC", serif' }}>维度评分</h3>
            {[
              { icon: <TrendingDown className="w-4 h-4" />, label: '债务健康', score: settlement.debtHealthScore, max: 40, color: 'text-red-400' },
              { icon: <Heart className="w-4 h-4" />, label: '满意度', score: settlement.satisfactionScore, max: 30, color: 'text-sky-400' },
              { icon: <Building2 className="w-4 h-4" />, label: '项目收益', score: settlement.projectScore, max: 20, color: 'text-green-400' },
              { icon: <BarChart3 className="w-4 h-4" />, label: '运营效率', score: settlement.efficiencyScore, max: 10, color: 'text-amber-400' },
            ].map((item, i) => (
              <div key={i} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 text-xs flex items-center gap-1.5">{item.icon} {item.label}</span>
                  <span className={`${item.color} text-sm font-mono font-semibold`}>{item.score.toFixed(1)} / {item.max}</span>
                </div>
                <div className="h-1.5 bg-[#243447] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#D4A843] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.score / item.max) * 100}%` }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.6 }}
                  />
                </div>
              </div>
            ))}

            {lastTurn && (
              <div className="mt-4 pt-4 border-t border-[#3A506B]/20">
                <div className="text-slate-500 text-xs mb-2">终局状态</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-slate-300 text-sm font-mono">{lastTurn.treasuryAfter.toFixed(0)}</div>
                    <div className="text-slate-600 text-[10px]">国库</div>
                  </div>
                  <div>
                    <div className="text-red-400 text-sm font-mono">{lastTurn.debtAfter.toFixed(0)}</div>
                    <div className="text-slate-600 text-[10px]">债务</div>
                  </div>
                  <div>
                    <div className={`text-sm font-mono ${lastTurn.satisfactionAfter > 50 ? 'text-green-400' : lastTurn.satisfactionAfter > 25 ? 'text-amber-400' : 'text-red-400'}`}>
                      {lastTurn.satisfactionAfter.toFixed(0)}
                    </div>
                    <div className="text-slate-600 text-[10px]">满意度</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {settlement.deductions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#1B2838] rounded-xl p-6 border border-[#3A506B]/20 mb-6"
          >
            <h3 className="text-[#D4A843] text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              <AlertTriangle className="w-4 h-4 text-red-400" /> 扣分明细
            </h3>
            <div className="space-y-2">
              {settlement.deductions.map((d, i) => (
                <div key={i} className="bg-[#243447]/50 rounded-lg p-3">
                  <button
                    onClick={() => setExpandedDeduction(expandedDeduction === i ? null : i)}
                    className="w-full flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs font-semibold">{d.category}</span>
                      <span className="text-slate-300 text-xs">-{d.amount}万</span>
                    </div>
                    {expandedDeduction === i ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                  {expandedDeduction === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-2 pt-2 border-t border-[#3A506B]/20"
                    >
                      <p className="text-slate-400 text-xs mb-1">{d.reason}</p>
                      <p className="text-slate-500 text-[10px]">计算口径：{d.calculationMethodology}</p>
                      {d.evidenceRef && (
                        <p className="text-purple-400 text-[10px] mt-1">证据引用：{d.evidenceRef}</p>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-red-400 text-xs font-semibold">
              总扣分：-{(settlement.deductions.reduce((s, d) => s + d.amount, 0) * 0.1).toFixed(1)}分
            </div>
          </motion.div>
        )}

        {settlement.consistencyWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-purple-400/5 border border-purple-400/20 rounded-xl p-6 mb-6"
          >
            <h3 className="text-purple-400 text-sm font-semibold mb-3" style={{ fontFamily: '"Noto Serif SC", serif' }}>
              一致性检查
            </h3>
            {settlement.consistencyWarnings.map((w, i) => (
              <div key={i} className="text-xs text-slate-300 mb-2">
                <span className="text-purple-400">第{w.turnNumber}回合</span> {w.description}
                <div className="text-slate-500 text-[10px] mt-0.5">{w.calculationDetail}</div>
                {w.satisfactionSupplement !== null && (
                  <div className="text-purple-300 text-[10px]">满意度补充证据：{w.satisfactionSupplement}</div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        <div className="flex justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/review')}
            className="bg-[#D4A843] text-[#0D1B1E] px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 cursor-pointer hover:bg-[#E0B85A] transition-colors"
          >
            进入复盘 <ArrowRight className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { useGameStore.getState().restartGame(); navigate('/') }}
            className="border border-[#3A506B] text-slate-400 px-6 py-2.5 rounded-lg font-semibold cursor-pointer hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            重新开始
          </motion.button>
        </div>
      </div>
    </div>
  )
}
