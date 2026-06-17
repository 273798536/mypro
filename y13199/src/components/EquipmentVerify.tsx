import { useState, useCallback, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, Replace, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import type { TensionReport, DuplicateDecision, DuplicateMode } from '../types'

interface Props {
  equipmentId: string
  onDecision: (decision: DuplicateDecision) => void
}

export default function EquipmentVerify({ equipmentId, onDecision }: Props) {
  const { checkDuplicate } = useReportStore()
  const [checkResult, setCheckResult] = useState<{
    isDuplicate: boolean
    existingReports: TensionReport[]
  } | null>(null)
  const [selectedMode, setSelectedMode] = useState<DuplicateMode>(null)
  const [selectedOverrideId, setSelectedOverrideId] = useState<string | null>(null)
  const [showOverridePicker, setShowOverridePicker] = useState(false)

  const overrideTarget = useMemo(
    () => (selectedOverrideId ? checkResult?.existingReports.find((r) => r.id === selectedOverrideId) : undefined),
    [checkResult, selectedOverrideId]
  )

  const latestReport = useMemo(
    () => checkResult?.existingReports.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0],
    [checkResult]
  )

  const handleCheck = useCallback(() => {
    if (!equipmentId.trim()) return
    const result = checkDuplicate(equipmentId.trim())
    setCheckResult(result)
    setSelectedMode(null)
    setSelectedOverrideId(null)
    setShowOverridePicker(false)
    onDecision({
      isDuplicate: result.isDuplicate,
      existingReports: result.existingReports,
      mode: null,
    })
  }, [equipmentId, checkDuplicate, onDecision])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleCheck()
    },
    [handleCheck]
  )

  const handleModeSelect = useCallback(
    (mode: DuplicateMode) => {
      if (!checkResult?.isDuplicate) return
      setSelectedMode(mode)
      const targetId = mode === 'override'
        ? (selectedOverrideId ?? latestReport?.id)
        : undefined
      if (mode === 'override' && !selectedOverrideId && latestReport) {
        setSelectedOverrideId(latestReport.id)
      }
      onDecision({
        isDuplicate: true,
        existingReports: checkResult.existingReports,
        mode,
        overrideTargetId: mode === 'override' ? (targetId ?? latestReport?.id) : undefined,
        parentId: mode === 'subreport' ? latestReport?.id : undefined,
      })
    },
    [checkResult, selectedOverrideId, latestReport, onDecision]
  )

  const handleOverrideTargetChange = useCallback(
    (id: string) => {
      setSelectedOverrideId(id)
      onDecision({
        isDuplicate: true,
        existingReports: checkResult?.existingReports ?? [],
        mode: 'override',
        overrideTargetId: id,
      })
    },
    [checkResult, onDecision]
  )

  if (!equipmentId.trim()) return null

  return (
    <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
        <AlertTriangle className="h-3.5 w-3.5" />
        设备编号校验
      </h3>

      <button
        onClick={handleCheck}
        onKeyDown={handleKeyDown}
        className="mb-4 rounded-lg bg-[#1B3A5C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0F2640]"
      >
        校验编号重复
      </button>

      {checkResult && (
        <div className="animate-fadeIn">
          {checkResult.isDuplicate ? (
            <div className="rounded-lg border border-[#C44D3F]/30 bg-[#C44D3F]/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#C44D3F]" />
                <span className="text-sm font-semibold text-[#C44D3F]">
                  发现重复设备编号
                </span>
              </div>

              <div className="mb-3 space-y-2 max-h-56 overflow-y-auto">
                {checkResult.existingReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() =>
                      handleOverrideTargetChange(report.id)
                    }
                    className={`w-full rounded-lg bg-white p-3 text-left shadow-sm transition-all ${
                      selectedOverrideId === report.id
                        ? 'ring-2 ring-[#E8A838]'
                        : 'hover:bg-[#F8FAFB]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs font-bold text-[#1B3A5C]">
                          {report.equipmentId}
                          {report.origin === 'subreport' && (
                            <span className="ml-2 rounded bg-[#7C8CF8]/10 px-1.5 py-0.5 font-sans text-[9px] text-[#7C8CF8]">
                              子报告 #{report.subIndex}
                            </span>
                          )}
                          {report.origin === 'override' && (
                            <span className="ml-2 rounded bg-[#E8A838]/10 px-1.5 py-0.5 font-sans text-[9px] text-[#E8A838]">
                              覆盖记录
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#8BA3BF]">
                          录入时间：
                          {new Date(report.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#C44D3F]/10 px-2 py-0.5 text-[10px] font-medium text-[#C44D3F]">
                        张力 {report.tensionValue.toFixed(2)} kN
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-[#0F2640]/5 p-3">
                <p className="mb-1 text-xs font-semibold text-[#1B3A5C]">原因</p>
                <p className="text-xs text-[#3A5A7A]">
                  设备编号 {equipmentId}（含子报告）已有{' '}
                  {checkResult.existingReports.length} 条报告记录。必须先选择一种处理方式，才能保存。
                </p>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5A7A9A]">
                  下一步（必选一项）
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => handleModeSelect('override')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      selectedMode === 'override'
                        ? 'border-[#E8A838] bg-[#E8A838]/20 text-[#B07B1C]'
                        : 'border-[#E8A838]/30 bg-[#E8A838]/10 text-[#E8A838] hover:bg-[#E8A838]/20'
                    }`}
                  >
                    <Replace className="h-3 w-3" />
                    覆盖旧报告
                    {selectedMode === 'override' && overrideTarget && (
                      <span className="ml-1 font-mono text-[9px] opacity-80">
                        → {overrideTarget.equipmentId}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleModeSelect('subreport')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      selectedMode === 'subreport'
                        ? 'border-[#2D9B83] bg-[#2D9B83]/20 text-[#1D6B58]'
                        : 'border-[#2D9B83]/30 bg-[#2D9B83]/10 text-[#2D9B83] hover:bg-[#2D9B83]/20'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    新建子报告
                    {selectedMode === 'subreport' && (
                      <span className="ml-1 font-mono text-[9px] opacity-80">
                        → {equipmentId}-S
                      </span>
                    )}
                  </button>
                </div>

                {selectedMode === 'override' && checkResult.existingReports.length > 1 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowOverridePicker((v) => !v)}
                      className="flex items-center gap-1 text-[10px] text-[#5A7A9A] hover:text-[#1B3A5C]"
                    >
                      {showOverridePicker ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      当前覆盖目标：
                      <span className="font-mono font-semibold text-[#1B3A5C]">
                        {overrideTarget?.equipmentId ?? latestReport?.equipmentId}
                      </span>
                      {checkResult.existingReports.length > 1 && '（点击选择其它）'}
                    </button>
                    {showOverridePicker && (
                      <div className="mt-2 space-y-1">
                        {checkResult.existingReports.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => handleOverrideTargetChange(r.id)}
                            className={`block w-full rounded-md px-2 py-1.5 text-left text-[11px] ${
                              selectedOverrideId === r.id
                                ? 'bg-[#E8A838]/20 text-[#1B3A5C]'
                                : 'bg-white hover:bg-[#F8FAFB] text-[#5A7A9A]'
                            }`}
                          >
                            <span className="font-mono">{r.equipmentId}</span>
                            <span className="ml-2">
                              {r.tensionValue.toFixed(2)} kN ·{' '}
                              {new Date(r.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedMode && (
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-[#2D9B83]/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2D9B83]" />
                    <span className="text-xs text-[#1D6B58]">
                      {selectedMode === 'override'
                        ? `将以新数据覆盖：${overrideTarget?.equipmentId ?? latestReport?.equipmentId ?? '已选记录'}`
                        : `将创建子报告，新编号：${equipmentId}-S1（依次递增）`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-[#2D9B83]/30 bg-[#2D9B83]/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-[#2D9B83]" />
              <span className="text-sm text-[#2D9B83]">设备编号无重复，可继续录入</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
