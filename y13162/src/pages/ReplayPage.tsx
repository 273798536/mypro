import { useReplayStore } from '@/store/replayStore'
import ReplayChart from '@/components/ReplayChart'
import ParameterTable from '@/components/ParameterTable'
import NoiseBanner from '@/components/NoiseBanner'
import BadDataTraceCard from '@/components/BadDataTraceCard'
import { Play, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { ParameterKey } from '@/types'
import { parameterLabels, parameterUnits } from '@/types'

export default function ReplayPage() {
  const { appliedParameters, overrides, runRecalculation, isRecalculated, applyOverride, resetToOriginal } =
    useReplayStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOverride, setNewOverride] = useState({
    parameterName: 'waveHeight' as ParameterKey,
    timestamp: appliedParameters[12]?.timestamp || '',
    oldValue: 15.2,
    newValue: 3.8,
    reason: '确认噪声，按前后插值修正',
    operator: '阿岑',
    sourceNoteLine: '维修备注第12行',
    sourceNoteObject: '波高传感器 A-07',
  })

  const handleAddOverride = () => {
    applyOverride({
      buoyId: 'BUOY-001',
      timestamp: newOverride.timestamp,
      parameterName: newOverride.parameterName,
      oldValue: newOverride.oldValue,
      newValue: newOverride.newValue,
      reason: newOverride.reason,
      operator: newOverride.operator,
      sourceNoteLine: newOverride.sourceNoteLine,
      sourceNoteObject: newOverride.sourceNoteObject,
    })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">海浪浮标参数回放</h1>
          <p className="text-xs text-slate-400 mt-0.5">浮标 BUOY-001 · 2025-06-13 08:00 - 09:00</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-sm text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            录入改判
          </button>
          <button
            onClick={runRecalculation}
            className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 rounded-sm text-xs flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            复算
          </button>
          <button
            onClick={resetToOriginal}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 rounded-sm text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-sm p-4">
          <h3 className="text-sm font-medium text-slate-200 mb-3">录入人工改判</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">参数</label>
              <select
                value={newOverride.parameterName}
                onChange={(e) =>
                  setNewOverride({ ...newOverride, parameterName: e.target.value as ParameterKey })
                }
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              >
                {(['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure'] as ParameterKey[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {parameterLabels[k]}（{parameterUnits[k]}）
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">时间点</label>
              <select
                value={newOverride.timestamp}
                onChange={(e) => setNewOverride({ ...newOverride, timestamp: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              >
                {appliedParameters.map((p) => {
                  const d = new Date(p.timestamp)
                  return (
                    <option key={p.id} value={p.timestamp}>
                      {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">原值</label>
              <input
                type="number"
                step="0.1"
                value={newOverride.oldValue}
                onChange={(e) => setNewOverride({ ...newOverride, oldValue: +e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">改判值</label>
              <input
                type="number"
                step="0.1"
                value={newOverride.newValue}
                onChange={(e) => setNewOverride({ ...newOverride, newValue: +e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">改判原因</label>
              <input
                type="text"
                value={newOverride.reason}
                onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">操作员</label>
              <input
                type="text"
                value={newOverride.operator}
                onChange={(e) => setNewOverride({ ...newOverride, operator: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">来源备注行</label>
              <input
                type="text"
                value={newOverride.sourceNoteLine}
                onChange={(e) => setNewOverride({ ...newOverride, sourceNoteLine: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">来源对象</label>
              <input
                type="text"
                value={newOverride.sourceNoteObject}
                onChange={(e) => setNewOverride({ ...newOverride, sourceNoteObject: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-sm text-xs transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddOverride}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-sm text-xs transition-colors"
            >
              确认添加
            </button>
          </div>
        </div>
      )}

      {isRecalculated && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-sm px-4 py-2 text-xs text-green-300">
          ✓ 已复算完成，图表与明细已同步更新
        </div>
      )}

      {overrides.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-sm p-3">
          <div className="text-xs text-slate-400 mb-2">已录入改判（{overrides.length}）</div>
          <div className="flex flex-wrap gap-2">
            {overrides.map((ov) => (
              <div
                key={ov.id}
                className="bg-green-500/10 border border-green-500/30 rounded-sm px-2 py-1 text-xs text-green-300"
              >
                {new Date(ov.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {parameterLabels[ov.parameterName as ParameterKey]} {ov.oldValue} → {ov.newValue}
              </div>
            ))}
          </div>
        </div>
      )}

      <NoiseBanner />

      <ReplayChart useApplied={isRecalculated} showOverrideMarkers={true} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ParameterTable />
        </div>
        <div>
          <BadDataTraceCard />
        </div>
      </div>
    </div>
  )
}
