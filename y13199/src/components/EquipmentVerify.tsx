import { useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Replace, Plus } from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import type { TensionReport } from '../types'

interface Props {
  equipmentId: string
  onDuplicateFound: (result: { isDuplicate: boolean; existingReports: TensionReport[] }) => void
}

export default function EquipmentVerify({ equipmentId, onDuplicateFound }: Props) {
  const { checkDuplicate } = useReportStore()
  const [checkResult, setCheckResult] = useState<{
    isDuplicate: boolean
    existingReports: TensionReport[]
  } | null>(null)

  const handleCheck = useCallback(() => {
    if (!equipmentId.trim()) return
    const result = checkDuplicate(equipmentId.trim())
    setCheckResult(result)
    onDuplicateFound(result)
  }, [equipmentId, checkDuplicate, onDuplicateFound])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleCheck()
    },
    [handleCheck]
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
                <span className="text-sm font-semibold text-[#C44D3F]">发现重复设备编号</span>
              </div>

              <div className="mb-3 space-y-2">
                {checkResult.existingReports.map((report) => (
                  <div key={report.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs font-bold text-[#1B3A5C]">{report.equipmentId}</p>
                        <p className="text-[10px] text-[#8BA3BF]">
                          录入时间：{new Date(report.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#C44D3F]/10 px-2 py-0.5 text-[10px] font-medium text-[#C44D3F]">
                        张力 {report.tensionValue.toFixed(2)} kN
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-[#0F2640]/5 p-3">
                <p className="mb-1 text-xs font-semibold text-[#1B3A5C]">原因</p>
                <p className="text-xs text-[#3A5A7A]">
                  设备编号 {equipmentId} 已有 {checkResult.existingReports.length} 条报告记录，需确认操作方式。
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onDuplicateFound({ ...checkResult, nextStep: 'override' } as any)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E8A838]/30 bg-[#E8A838]/10 px-3 py-1.5 text-xs font-medium text-[#E8A838] transition-colors hover:bg-[#E8A838]/20"
                >
                  <Replace className="h-3 w-3" />
                  覆盖旧报告
                </button>
                <button
                  onClick={() => onDuplicateFound({ ...checkResult, nextStep: 'new' } as any)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2D9B83]/30 bg-[#2D9B83]/10 px-3 py-1.5 text-xs font-medium text-[#2D9B83] transition-colors hover:bg-[#2D9B83]/20"
                >
                  <Plus className="h-3 w-3" />
                  新建子报告
                </button>
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
