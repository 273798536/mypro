import { useState, useCallback } from 'react'
import { Printer, Save, RotateCcw } from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import FormulaDisplay from '../components/FormulaDisplay'
import ResultDisplay from '../components/ResultDisplay'
import SupplementaryNote from '../components/SupplementaryNote'
import PageSummary from '../components/PageSummary'
import EquipmentVerify from '../components/EquipmentVerify'
import type { BoundaryStatus, TensionReport } from '../types'
import { generateConclusion, determineReportStatus } from '../utils/tensionCalc'
import { DEFAULT_GRAVITY } from '../types'

export default function ReportGeneration() {
  const { addReport, updateReport } = useReportStore()

  const [equipmentId, setEquipmentId] = useState('')
  const [loadWeight, setLoadWeight] = useState('')
  const [pulleyCount, setPulleyCount] = useState('')
  const [gravity, setGravity] = useState(String(DEFAULT_GRAVITY))
  const [supplementaryNote, setSupplementaryNote] = useState('')
  const [currentTension, setCurrentTension] = useState(0)
  const [currentBoundary, setCurrentBoundary] = useState<BoundaryStatus>('normal')
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [savedReport, setSavedReport] = useState<TensionReport | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleResult = useCallback((tensionValue: number, boundaryStatus: BoundaryStatus) => {
    setCurrentTension(tensionValue)
    setCurrentBoundary(boundaryStatus)
  }, [])

  const handleDuplicateFound = useCallback((result: { isDuplicate: boolean }) => {
    setIsDuplicate(result.isDuplicate)
  }, [])

  const handleNoteChange = useCallback((note: string) => {
    setSupplementaryNote(note)
    if (savedReport) {
      const newConclusion = generateConclusion(currentTension, currentBoundary, equipmentId, note)
      const newStatus = determineReportStatus(currentBoundary, note, isDuplicate)
      updateReport(savedReport.id, {
        supplementaryNote: note,
        conclusion: newConclusion,
        status: newStatus,
      })
    }
  }, [savedReport, currentTension, currentBoundary, equipmentId, isDuplicate, updateReport])

  const handleSave = useCallback(() => {
    if (!equipmentId.trim() || !loadWeight || !pulleyCount) return

    const report = addReport({
      equipmentId: equipmentId.trim(),
      loadWeight: parseFloat(loadWeight),
      pulleyCount: parseInt(pulleyCount),
      gravity: parseFloat(gravity),
      supplementaryNote,
      isDuplicate,
    })

    setSavedReport(report)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }, [equipmentId, loadWeight, pulleyCount, gravity, supplementaryNote, isDuplicate, addReport])

  const handleReset = useCallback(() => {
    setEquipmentId('')
    setLoadWeight('')
    setPulleyCount('')
    setGravity(String(DEFAULT_GRAVITY))
    setSupplementaryNote('')
    setCurrentTension(0)
    setCurrentBoundary('normal')
    setIsDuplicate(false)
    setSavedReport(null)
    setShowSuccess(false)
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const canSave = equipmentId.trim() && loadWeight && pulleyCount

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn rounded-lg border border-[#2D9B83]/30 bg-[#2D9B83]/10 px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-[#2D9B83]">报告已保存成功</p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C]">滑轮组张力报告生成</h2>
        <p className="mt-1 text-sm text-[#5A7A9A]">录入测量值，自动计算张力并生成可追溯报告</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-6">
          <FormulaDisplay />
          <EquipmentVerify equipmentId={equipmentId} onDuplicateFound={handleDuplicateFound} />
        </div>

        <div className="col-span-8 space-y-6">
          <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">测量值输入</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">设备编号</label>
                <input
                  type="text"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  placeholder="如：PUL-2024-0315"
                  className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] px-4 py-2.5 text-sm font-mono text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">载荷重量 W</label>
                <div className="relative">
                  <input
                    type="number"
                    value={loadWeight}
                    onChange={(e) => setLoadWeight(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] px-4 py-2.5 pr-12 text-sm font-mono text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8BA3BF]">kg</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">滑轮组数 n</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pulleyCount}
                    onChange={(e) => setPulleyCount(e.target.value)}
                    placeholder="1"
                    min="1"
                    step="1"
                    className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] px-4 py-2.5 pr-16 text-sm font-mono text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8BA3BF]">正整数</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">重力加速度 g</label>
                <div className="relative">
                  <input
                    type="number"
                    value={gravity}
                    onChange={(e) => setGravity(e.target.value)}
                    placeholder="9.81"
                    step="0.01"
                    className="w-full rounded-lg border border-[#1B3A5C]/15 bg-[#F8FAFB] px-4 py-2.5 pr-14 text-sm font-mono text-[#1B3A5C] placeholder:text-[#8BA3BF]/60 focus:border-[#2D9B83] focus:outline-none focus:ring-1 focus:ring-[#2D9B83]/30 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8BA3BF]">m/s&sup2;</span>
                </div>
              </div>
            </div>
          </div>

          <ResultDisplay
            equipmentId={equipmentId}
            loadWeight={loadWeight}
            pulleyCount={pulleyCount}
            gravity={gravity}
            onResult={handleResult}
          />

          <SupplementaryNote
            supplementaryNote={supplementaryNote}
            conclusion={
              currentTension > 0
                ? generateConclusion(currentTension, currentBoundary, equipmentId, supplementaryNote)
                : ''
            }
            onNoteChange={handleNoteChange}
          />

          <PageSummary report={savedReport} />

          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-2 rounded-lg bg-[#2D9B83] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#248F78] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              保存报告
            </button>
            <button
              onClick={handlePrint}
              disabled={!savedReport}
              className="flex items-center gap-2 rounded-lg border border-[#1B3A5C]/15 bg-white px-5 py-2.5 text-sm font-medium text-[#1B3A5C] transition-all hover:bg-[#F8FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              打印/导出
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-[#1B3A5C]/15 bg-white px-5 py-2.5 text-sm font-medium text-[#5A7A9A] transition-all hover:bg-[#F8FAFB]"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
