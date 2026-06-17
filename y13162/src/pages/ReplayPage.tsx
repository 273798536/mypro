import { useReplayStore } from '@/store/replayStore'
import ReplayChart from '@/components/ReplayChart'
import ParameterTable from '@/components/ParameterTable'
import NoiseBanner from '@/components/NoiseBanner'
import BadDataTraceCard from '@/components/BadDataTraceCard'
import { Play, Plus, RotateCcw } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import type { ParameterKey } from '@/types'
import { parameterLabels, parameterUnits } from '@/types'

function formatTime(ts: string): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function ReplayPage() {
  const {
    rawParameters,
    appliedParameters,
    repairNotes,
    overrides,
    runRecalculation,
    isRecalculated,
    applyOverride,
    resetToOriginal,
  } = useReplayStore()

  const [showAddForm, setShowAddForm] = useState(false)

  const defaultIdx = rawParameters.findIndex((p) => p.id === 'p7') // 08:12，波高15.2的那条
  const fallbackIdx = Math.min(6, rawParameters.length - 1)
  const startIdx = defaultIdx >= 0 ? defaultIdx : fallbackIdx

  const [selectedParam, setSelectedParam] = useState<ParameterKey>('waveHeight')
  const [selectedTimestamp, setSelectedTimestamp] = useState<string>(
    rawParameters[startIdx]?.timestamp || '',
  )
  const [sourceNoteId, setSourceNoteId] = useState<string>('n3') // 默认关联到最终确认那条备注
  const [newValue, setNewValue] = useState<number>(3.8)
  const [reason, setReason] = useState<string>('确认噪声，按前后插值修正')
  const [operator, setOperator] = useState<string>('阿岑')

  const selectedParamRecord = useMemo(() => {
    return rawParameters.find((p) => p.timestamp === selectedTimestamp) || null
  }, [rawParameters, selectedTimestamp])

  const autoOldValue = useMemo(() => {
    if (!selectedParamRecord) return 0
    return (selectedParamRecord as any)[selectedParam] as number
  }, [selectedParamRecord, selectedParam])

  const selectedNote = useMemo(() => {
    return repairNotes.find((n) => n.id === sourceNoteId) || null
  }, [repairNotes, sourceNoteId])

  useEffect(() => {
    if (showAddForm && selectedParamRecord) {
      const interpolatedVal = autoOldValue > 10 ? autoOldValue * 0.25 : autoOldValue * 0.8
      setNewValue(Math.round(interpolatedVal * 10) / 10)
    }
  }, [showAddForm, selectedParam, selectedTimestamp, autoOldValue, selectedParamRecord])

  const handleAddOverride = () => {
    if (!selectedParamRecord) return

    applyOverride({
      buoyId: 'BUOY-001',
      timestamp: selectedTimestamp,
      parameterName: selectedParam,
      oldValue: autoOldValue,
      newValue: newValue,
      reason: reason,
      operator: operator,
      sourceNoteId: sourceNoteId || undefined,
      sourceNoteLine: selectedNote?.lineNumber || '维修备注',
      sourceNoteObject: selectedNote?.relatedObject || '未指定',
    })
    setShowAddForm(false)
  }

  const handleNoteChange = (noteId: string) => {
    setSourceNoteId(noteId)
    const note = repairNotes.find((n) => n.id === noteId)
    if (note && note.relatedParameterIds.length > 0) {
      const firstParamId = note.relatedParameterIds[0]
      const param = rawParameters.find((p) => p.id === firstParamId)
      if (param) {
        setSelectedTimestamp(param.timestamp)
      }
    }
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
            <div className="col-span-2">
              <label className="block text-slate-400 mb-1">来源维修备注</label>
              <select
                value={sourceNoteId}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              >
                <option value="">-- 选择维修备注（可选）--</option>
                {repairNotes.map((note) => (
                  <option key={note.id} value={note.id}>
                    [{note.lineNumber}] {formatTime(note.timestamp)} {note.relatedObject} -{' '}
                    {note.content.substring(0, 30)}
                    {note.content.length > 30 ? '…' : ''}
                  </option>
                ))}
              </select>
              {selectedNote && (
                <div className="mt-1.5 text-[11px] text-amber-400/80 bg-amber-500/5 rounded-sm px-2 py-1.5 border border-amber-500/20">
                  <span className="text-amber-300 font-medium">备注原文：</span>
                  {selectedNote.content}
                  {selectedNote.relatedParameterIds.length > 0 && (
                    <span className="block mt-1 text-amber-300/80">
                      自动匹配：{formatTime(selectedTimestamp)} {parameterLabels[selectedParam]}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">参数</label>
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value as ParameterKey)}
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
                value={selectedTimestamp}
                onChange={(e) => setSelectedTimestamp(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              >
                {appliedParameters.map((p) => {
                  const d = new Date(p.timestamp)
                  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                  const isP7 = p.id === 'p7'
                  const hasNoise = p.id === 'p7' || p.id === 'p17'
                  return (
                    <option key={p.id} value={p.timestamp}>
                      {timeStr} {isP7 ? '⚠️ ' : ''}
                      {parameterLabels[selectedParam]}: {(p as any)[selectedParam].toFixed(1)}
                      {parameterUnits[selectedParam]}
                      {hasNoise && !isP7 ? ' ⚠️' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                原值（自动读取，不可修改）
              </label>
              <input
                type="number"
                step="0.1"
                value={autoOldValue}
                readOnly
                className="w-full bg-slate-700/50 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">改判值</label>
              <input
                type="number"
                step="0.1"
                value={newValue}
                onChange={(e) => setNewValue(+e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">改判原因</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">操作员</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">来源行（自动）</label>
              <input
                type="text"
                value={selectedNote?.lineNumber || ''}
                readOnly
                className="w-full bg-slate-700/50 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">来源对象（自动）</label>
              <input
                type="text"
                value={selectedNote?.relatedObject || ''}
                readOnly
                className="w-full bg-slate-700/50 border border-slate-600 rounded-sm px-2 py-1.5 text-slate-400 cursor-not-allowed"
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
              disabled={!selectedParamRecord}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-sm text-xs transition-colors"
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
                {formatTime(ov.timestamp)} · {parameterLabels[ov.parameterName as ParameterKey]}{' '}
                <span className="line-through text-slate-500">{ov.oldValue}</span> →{' '}
                <span className="font-medium">{ov.newValue}</span>
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
