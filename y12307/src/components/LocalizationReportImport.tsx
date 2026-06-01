import { useState } from 'react'
import { FileUp, Trash2, AlertTriangle } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import type { ComponentProbability, EvidenceItem } from '@/types'

export default function LocalizationReportImport() {
  const addReport = useBayesianStore(s => s.addReport)
  const reports = useBayesianStore(s => s.reports)
  const removeReport = useBayesianStore(s => s.removeReport)
  const calibrationConflicts = useBayesianStore(s => s.calibrationConflicts)

  const [source, setSource] = useState('')
  const [priorStrength, setPriorStrength] = useState('0.5')
  const [rankingText, setRankingText] = useState('')

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source || !rankingText.trim()) return

    const lines = rankingText.trim().split('\n')
    const componentRanking: ComponentProbability[] = []
    const evidenceChain: EvidenceItem[] = []

    for (const line of lines) {
      const parts = line.split(/[,\t]+/).map(p => p.trim())
      if (parts.length >= 3) {
        componentRanking.push({
          component: parts[0],
          probability: parseFloat(parts[1]) || 0,
          previousRank: 0,
          currentRank: componentRanking.length + 1,
          rankChanged: false,
          material: parts[2] || '未指定',
          object: parts[3] || '未指定',
        })
      }
    }

    if (componentRanking.length === 0) return

    const prior = parseFloat(priorStrength) || 0.5
    if (prior > 0.7) {
      evidenceChain.push({
        sourceId: 'import-warn',
        sourceType: 'report',
        description: `导入报告先验强度 ${(prior * 100).toFixed(0)}%，超过 70% 阈值，可能主导更新结果`,
        contributionToRank: '先验过强风险',
        confidence: 0.5,
      })
    }

    addReport({
      source,
      componentRanking,
      priorStrength: prior,
      evidenceChain,
    })

    setSource('')
    setPriorStrength('0.5')
    setRankingText('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleImport} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">报告来源</label>
            <input
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="例: X射线检测/超声波探伤"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">先验强度</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={priorStrength}
              onChange={e => setPriorStrength(e.target.value)}
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono focus:border-amber-500/50 focus:outline-none"
            />
            {parseFloat(priorStrength) > 0.7 && (
              <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> 先验过强（&gt;70%）
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            部件排序（每行: 部件名, 概率, 材料, 对象）
          </label>
          <textarea
            value={rankingText}
            onChange={e => setRankingText(e.target.value)}
            placeholder={"轴承磨损, 0.45, 轴承钢, 主轴电机\n绕组短路, 0.30, 铜绕组, 定子\n润滑不足, 0.25, 润滑脂, 轴承座"}
            rows={5}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none font-mono resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded px-4 py-2 text-sm hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <FileUp size={16} /> 导入定位报告
        </button>
      </form>

      {calibrationConflicts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-yellow-400 flex items-center gap-1">
            <AlertTriangle size={14} /> 口径冲突（系统未自动修改）
          </p>
          {calibrationConflicts.map(c => (
            <div key={c.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-xs">
              <div className="text-yellow-300">{c.field}</div>
              <div className="text-zinc-400 mt-1">已有: {c.existingCalibration}</div>
              <div className="text-zinc-400">导入: {c.incomingCalibration}</div>
              <div className="text-zinc-500 mt-1">自动修改: {c.autoModified ? '是' : '否'}</div>
            </div>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-xs text-zinc-500">已导入 {reports.length} 份报告</p>
          {reports.map(r => (
            <div key={r.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sky-400">{r.source}</span>
                <button onClick={() => removeReport(r.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-zinc-400 font-mono mt-1">先验: {(r.priorStrength * 100).toFixed(0)}% | {r.componentRanking.length} 个部件</div>
              <div className="text-zinc-500 mt-0.5">
                {r.componentRanking.slice(0, 3).map(c => c.component).join(', ')}
                {r.componentRanking.length > 3 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
