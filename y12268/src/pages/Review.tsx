import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Download, FileJson, FileText, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { EVIDENCE_CATEGORY_LABELS, EVIDENCE_CATEGORY_BG } from '@/engine/evidence'
import { generateReport, generateHTMLReport } from '@/engine/calculations'
import type { EvidenceCategory } from '@/types/game'

export default function Review() {
  const {
    turns, snapshots, evidenceLog, settlement, delayRecords,
    revenueVersions, config, difficulty,
  } = useGameStore()
  const navigate = useNavigate()

  const [selectedTurn, setSelectedTurn] = useState(turns.length > 0 ? turns.length : 1)
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceCategory | 'all'>('all')

  const turnData = turns.find(t => t.turnNumber === selectedTurn)
  const snapshot = snapshots.find(s => s.turnNumber === selectedTurn)

  const filteredEvidence = evidenceFilter === 'all'
    ? evidenceLog
    : evidenceLog.filter(e => e.category === evidenceFilter)

  const handleExportJSON = () => {
    const report = generateReport({
      difficulty, config, turns, snapshots, evidenceLog, settlement,
      delayedProjects: delayRecords.map(d => ({ id: d.projectId, name: d.projectName } as any)),
    })
    const blob = new Blob([report], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `债务偿还经营赛_${difficulty}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportHTML = () => {
    const html = generateHTMLReport({
      difficulty, config, turns, snapshots, evidenceLog, settlement,
      delayedProjects: delayRecords.map(d => ({ id: d.projectId, name: d.projectName } as any)),
    })
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `债务偿还经营赛_${difficulty}_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const evidenceCategories: (EvidenceCategory | 'all')[] = ['all', 'interest', 'delay', 'revenue', 'consistency']

  return (
    <div className="min-h-screen bg-[#0D1B1E] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-[#D4A843] mb-1" style={{ fontFamily: '"Noto Serif SC", serif' }}>经营复盘</h1>
          <p className="text-slate-500 text-sm">回放每一回合决策，审计证据链，导出经营报告</p>
        </motion.div>

        <section className="mb-8">
          <h2 className="text-[#D4A843] text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            <Clock className="w-4 h-4" /> 回合回放
          </h2>

          <div className="bg-[#1B2838] rounded-xl p-6 border border-[#3A506B]/20">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedTurn(Math.max(1, selectedTurn - 1))}
                disabled={selectedTurn <= 1}
                className="p-2 rounded-lg text-slate-400 hover:text-[#D4A843] hover:bg-[#243447] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-[#D4A843] text-lg font-mono font-bold">第 {selectedTurn} 回合</div>
                <div className="text-slate-600 text-xs">共 {turns.length} 回合</div>
              </div>
              <button
                onClick={() => setSelectedTurn(Math.min(turns.length, selectedTurn + 1))}
                disabled={selectedTurn >= turns.length}
                className="p-2 rounded-lg text-slate-400 hover:text-[#D4A843] hover:bg-[#243447] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {turns.map(t => (
                <button
                  key={t.turnNumber}
                  onClick={() => setSelectedTurn(t.turnNumber)}
                  className={`px-3 py-1 rounded text-xs font-mono cursor-pointer transition-all shrink-0 ${
                    selectedTurn === t.turnNumber
                      ? 'bg-[#D4A843] text-[#0D1B1E] font-semibold'
                      : 'bg-[#243447] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.turnNumber}
                </button>
              ))}
            </div>

            {turnData && (
              <motion.div
                key={selectedTurn}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: '国库', before: turnData.treasuryBefore, after: turnData.treasuryAfter, unit: '万', color: 'text-slate-300' },
                    { label: '债务', before: turnData.debtBefore, after: turnData.debtAfter, unit: '万', color: 'text-red-400' },
                    { label: '满意度', before: turnData.satisfactionBefore, after: turnData.satisfactionAfter, unit: '', color: 'text-sky-400' },
                    { label: '收入', before: 0, after: turnData.revenue, unit: '万', color: 'text-green-400' },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#243447]/50 rounded-lg p-3">
                      <div className="text-slate-600 text-[10px]">{item.label}</div>
                      <div className={`${item.color} text-sm font-mono font-semibold`}>
                        {item.after.toFixed(0)}{item.unit}
                      </div>
                      {item.before > 0 && (
                        <div className="text-slate-600 text-[10px]">
                          之前 {item.before.toFixed(0)}{item.unit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#243447]/50 rounded-lg p-3">
                    <div className="text-slate-600 text-[10px]">基建投资</div>
                    <div className="text-green-400 text-sm font-mono">{turnData.infraInvestment}万</div>
                  </div>
                  <div className="bg-[#243447]/50 rounded-lg p-3">
                    <div className="text-slate-600 text-[10px]">利息偿还</div>
                    <div className="text-amber-400 text-sm font-mono">{turnData.interestPayment}万</div>
                  </div>
                  <div className="bg-[#243447]/50 rounded-lg p-3">
                    <div className="text-slate-600 text-[10px]">民生支出</div>
                    <div className="text-sky-400 text-sm font-mono">{turnData.welfareSpending}万</div>
                  </div>
                </div>

                {turnData.projects.length > 0 && (
                  <div className="mt-4">
                    <div className="text-slate-500 text-[10px] mb-1">已选项目</div>
                    <div className="flex flex-wrap gap-2">
                      {turnData.projects.map((p, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            p.delayed ? 'bg-red-400/10 text-red-400' : 'bg-[#3A506B]/20 text-slate-400'
                          }`}
                        >
                          {p.name}{p.delayed ? '(延期)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {snapshot && (
                  <div className="mt-4 text-slate-600 text-[10px]">
                    综合利率：{(snapshot.comprehensiveRate * 100).toFixed(2)}% | 应计利息：{snapshot.results.interestAccrued.toFixed(1)}万 | 满意度变化：{snapshot.results.satisfactionChange > 0 ? '+' : ''}{snapshot.results.satisfactionChange.toFixed(1)}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-[#D4A843] text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            <Filter className="w-4 h-4" /> 证据链审计
          </h2>

          <div className="flex gap-2 mb-4">
            {evidenceCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setEvidenceFilter(cat)}
                className={`px-3 py-1 rounded text-xs cursor-pointer transition-all ${
                  evidenceFilter === cat
                    ? 'bg-[#D4A843] text-[#0D1B1E] font-semibold'
                    : 'bg-[#243447] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? '全部' : EVIDENCE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="bg-[#1B2838] rounded-xl border border-[#3A506B]/20 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#243447]">
                  <th className="text-left p-2 text-slate-500 font-medium">回合</th>
                  <th className="text-left p-2 text-slate-500 font-medium">类别</th>
                  <th className="text-left p-2 text-slate-500 font-medium">描述</th>
                  <th className="text-left p-2 text-slate-500 font-medium">计算口径</th>
                  <th className="text-center p-2 text-slate-500 font-medium">标记</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvidence.map((e) => (
                  <tr key={e.id} className="border-t border-[#3A506B]/10 hover:bg-[#243447]/30">
                    <td className="p-2 text-slate-400 font-mono">{e.turnNumber}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${EVIDENCE_CATEGORY_BG[e.category]}`}>
                        {EVIDENCE_CATEGORY_LABELS[e.category]}
                      </span>
                    </td>
                    <td className="p-2 text-slate-300 max-w-[200px] truncate">{e.description}</td>
                    <td className="p-2 text-slate-500 max-w-[200px] truncate">{e.calculationDetail}</td>
                    <td className="p-2 text-center">
                      {e.consistencyFlag && <span className="text-amber-400">⚠</span>}
                      {e.satisfactionSupplement !== null && (
                        <span className="text-purple-400 text-[10px] ml-1">满{e.satisfactionSupplement}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEvidence.length === 0 && (
              <div className="text-center text-slate-600 py-8 text-sm">暂无证据记录</div>
            )}
          </div>

          {revenueVersions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-slate-500 text-xs mb-2">收入变动版本记录</h3>
              <div className="space-y-1">
                {revenueVersions.map((v, i) => (
                  <div key={i} className="bg-[#243447]/30 rounded px-3 py-1.5 flex items-center gap-3 text-xs">
                    <span className="text-slate-600">v{v.version}</span>
                    <span className="text-slate-400">第{v.turnNumber}回合</span>
                    <span className="text-slate-500">{v.oldValue.toFixed(1)}万 → <span className="text-slate-300">{v.newValue.toFixed(1)}万</span></span>
                    <span className="text-slate-600 ml-auto">{v.changeReason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {delayRecords.length > 0 && (
            <div className="mt-4">
              <h3 className="text-slate-500 text-xs mb-2">项目延期记录</h3>
              <div className="space-y-1">
                {delayRecords.map((d, i) => (
                  <div key={i} className="bg-red-400/5 border border-red-400/10 rounded px-3 py-1.5 flex items-center gap-3 text-xs">
                    <span className="text-red-400">{d.projectName}</span>
                    <span className="text-slate-500">第{d.originalTurn}回合 → 第{d.delayedToTurn}回合</span>
                    <span className="text-red-400 ml-auto">扣罚 {d.penaltyAmount}万</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-[#D4A843] text-sm font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            <Download className="w-4 h-4" /> 报告导出
          </h2>
          <div className="bg-[#1B2838] rounded-xl p-6 border border-[#3A506B]/20">
            <p className="text-slate-400 text-xs mb-4">
              经营报告包含完整回合记录、证据链、结算评分及偿债计算口径说明，可直接转发同事，无需回来询问计算口径。
            </p>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4A843] text-[#0D1B1E] font-semibold cursor-pointer hover:bg-[#E0B85A] transition-colors"
              >
                <FileJson className="w-4 h-4" /> 导出 JSON
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleExportHTML}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#D4A843] text-[#D4A843] font-semibold cursor-pointer hover:bg-[#D4A843]/10 transition-colors"
              >
                <FileText className="w-4 h-4" /> 导出 HTML
              </motion.button>
            </div>
          </div>
        </section>

        <div className="flex justify-center">
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
