import { useState, useCallback, useMemo } from 'react'
import {
  Printer,
  Save,
  RotateCcw,
  FileText,
  FileJson,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import FormulaDisplay from '../components/FormulaDisplay'
import ResultDisplay from '../components/ResultDisplay'
import SupplementaryNote from '../components/SupplementaryNote'
import PageSummary from '../components/PageSummary'
import EquipmentVerify from '../components/EquipmentVerify'
import type { BoundaryStatus, TensionReport, DuplicateDecision } from '../types'
import { generateConclusion, determineReportStatus } from '../utils/tensionCalc'
import { DEFAULT_GRAVITY } from '../types'
import {
  exportReportAsText,
  exportReportAsJson,
  buildReportText,
} from '../utils/exportReport'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  type: ToastType
  title: string
  detail?: string
}

export default function ReportGeneration() {
  const { addReport, updateReport } = useReportStore()

  const [equipmentId, setEquipmentId] = useState('')
  const [loadWeight, setLoadWeight] = useState('')
  const [pulleyCount, setPulleyCount] = useState('')
  const [gravity, setGravity] = useState(String(DEFAULT_GRAVITY))
  const [supplementaryNote, setSupplementaryNote] = useState('')
  const [currentTension, setCurrentTension] = useState(0)
  const [currentBoundary, setCurrentBoundary] = useState<BoundaryStatus>('normal')
  const [savedReport, setSavedReport] = useState<TensionReport | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [duplicateDecision, setDuplicateDecision] = useState<DuplicateDecision | null>(null)

  const showToast = useCallback((t: Toast) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 4000)
  }, [])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    if (equipmentId.trim()) {
      if (!/^[A-Za-z0-9_\-\/]+$/.test(equipmentId.trim())) {
        errors.push('设备编号只允许字母、数字、下划线、短横线和斜杠')
      }
    } else {
      errors.push('设备编号不能为空')
    }
    if (loadWeight) {
      const w = parseFloat(loadWeight)
      if (!Number.isFinite(w) || w < 0) errors.push('载荷重量必须是 ≥ 0 的数字')
    } else {
      errors.push('载荷重量不能为空')
    }
    if (pulleyCount) {
      const n = parseInt(pulleyCount, 10)
      if (!Number.isInteger(n) || n <= 0) errors.push('滑轮组数必须是正整数')
    } else {
      errors.push('滑轮组数不能为空')
    }
    if (gravity) {
      const g = parseFloat(gravity)
      if (!Number.isFinite(g) || g <= 0) errors.push('重力加速度必须是正数')
    } else {
      errors.push('重力加速度不能为空')
    }
    return errors
  }, [equipmentId, loadWeight, pulleyCount, gravity])

  const duplicateRequiresDecision =
    duplicateDecision?.isDuplicate && !duplicateDecision.mode

  const canSave = validationErrors.length === 0 && !duplicateRequiresDecision

  const handleResult = useCallback((tensionValue: number, boundaryStatus: BoundaryStatus) => {
    setCurrentTension(tensionValue)
    setCurrentBoundary(boundaryStatus)
  }, [])

  const handleDuplicateDecision = useCallback((decision: DuplicateDecision) => {
    setDuplicateDecision(decision)
  }, [])

  const handleNoteChange = useCallback(
    (note: string) => {
      setSupplementaryNote(note)
      if (savedReport) {
        const newConclusion = generateConclusion(
          currentTension,
          currentBoundary,
          savedReport.equipmentId,
          note
        )
        const newStatus = determineReportStatus(
          currentBoundary,
          note,
          false
        )
        updateReport(savedReport.id, {
          supplementaryNote: note,
          conclusion: newConclusion,
          status: newStatus,
        })
        setSavedReport((prev) =>
          prev
            ? { ...prev, supplementaryNote: note, conclusion: newConclusion, status: newStatus }
            : prev
        )
      }
    },
    [savedReport, currentTension, currentBoundary, updateReport]
  )

  const handleSave = useCallback(() => {
    if (!canSave) {
      if (duplicateRequiresDecision) {
        showToast({
          type: 'error',
          title: '无法保存',
          detail: '设备编号存在重复，请先在左侧选择「覆盖旧报告」或「新建子报告」。',
        })
      } else {
        showToast({
          type: 'error',
          title: '输入不完整',
          detail: validationErrors[0],
        })
      }
      return
    }

    const mode = duplicateDecision?.mode
      ? (duplicateDecision.mode as 'override' | 'subreport')
      : 'new'

    try {
      const report = addReport({
        equipmentId: equipmentId.trim(),
        loadWeight: parseFloat(loadWeight),
        pulleyCount: parseInt(pulleyCount, 10),
        gravity: parseFloat(gravity),
        supplementaryNote,
        mode,
        overrideTargetId: mode === 'override' ? duplicateDecision?.overrideTargetId : undefined,
        parentId: mode === 'subreport' ? duplicateDecision?.parentId : undefined,
      })

      setSavedReport(report)

      if (mode === 'override') {
        showToast({
          type: 'success',
          title: '已覆盖旧报告',
          detail: `新编号 ${report.equipmentId}，张力 ${report.tensionValue.toFixed(2)} kN。`,
        })
      } else if (mode === 'subreport') {
        showToast({
          type: 'success',
          title: '子报告已创建',
          detail: `子报告编号 ${report.equipmentId}，已关联到父报告。`,
        })
      } else {
        showToast({
          type: 'success',
          title: '报告已保存成功',
          detail: `${report.equipmentId} · ${report.tensionValue.toFixed(2)} kN。`,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存时发生未知错误'
      showToast({ type: 'error', title: '保存失败', detail: msg })
    }
  }, [
    canSave,
    duplicateRequiresDecision,
    validationErrors,
    duplicateDecision,
    equipmentId,
    loadWeight,
    pulleyCount,
    gravity,
    supplementaryNote,
    addReport,
    showToast,
  ])

  const handleReset = useCallback(() => {
    setEquipmentId('')
    setLoadWeight('')
    setPulleyCount('')
    setGravity(String(DEFAULT_GRAVITY))
    setSupplementaryNote('')
    setCurrentTension(0)
    setCurrentBoundary('normal')
    setSavedReport(null)
    setDuplicateDecision(null)
    setShowExportMenu(false)
  }, [])

  const handlePrint = useCallback(() => {
    if (!savedReport) return
    try {
      window.print()
    } catch (err) {
      showToast({ type: 'error', title: '打印失败', detail: String(err) })
    }
  }, [savedReport, showToast])

  const handleExportText = useCallback(() => {
    if (!savedReport) return
    try {
      exportReportAsText(savedReport)
      showToast({
        type: 'success',
        title: '文本报告已导出',
        detail: `已下载 ${savedReport.equipmentId}-张力报告.txt`,
      })
    } catch (err) {
      showToast({ type: 'error', title: '导出失败', detail: String(err) })
    }
    setShowExportMenu(false)
  }, [savedReport, showToast])

  const handleExportJson = useCallback(() => {
    if (!savedReport) return
    try {
      exportReportAsJson(savedReport)
      showToast({
        type: 'success',
        title: 'JSON 报告已导出',
        detail: `已下载 ${savedReport.equipmentId}-张力报告.json`,
      })
    } catch (err) {
      showToast({ type: 'error', title: '导出失败', detail: String(err) })
    }
    setShowExportMenu(false)
  }, [savedReport, showToast])

  const handleCopyText = useCallback(async () => {
    if (!savedReport) return
    try {
      await navigator.clipboard.writeText(buildReportText(savedReport))
      showToast({ type: 'success', title: '已复制到剪贴板', detail: '可直接粘贴到邮件或工单。' })
    } catch {
      showToast({ type: 'warning', title: '复制失败', detail: '当前浏览器不支持剪贴板 API，请改用导出。' })
    }
    setShowExportMenu(false)
  }, [savedReport, showToast])

  const toastIcon = useMemo(() => {
    if (!toast) return null
    if (toast.type === 'success') return <CheckCircle2 className="h-5 w-5 text-[#2D9B83]" />
    if (toast.type === 'error') return <XCircle className="h-5 w-5 text-[#C44D3F]" />
    return <AlertCircle className="h-5 w-5 text-[#E8A838]" />
  }, [toast])

  const toastColor = useMemo(() => {
    if (!toast) return ''
    if (toast.type === 'success') return 'border-[#2D9B83]/30 bg-[#2D9B83]/10'
    if (toast.type === 'error') return 'border-[#C44D3F]/30 bg-[#C44D3F]/10'
    return 'border-[#E8A838]/30 bg-[#E8A838]/10'
  }, [toast])

  const toastTextColor = useMemo(() => {
    if (!toast) return ''
    if (toast.type === 'success') return 'text-[#2D9B83]'
    if (toast.type === 'error') return 'text-[#C44D3F]'
    return 'text-[#E8A838]'
  }, [toast])

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex max-w-sm animate-slideIn items-start gap-3 rounded-lg border shadow-lg ${toastColor} px-4 py-3`}
          role="status"
        >
          {toastIcon}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${toastTextColor}`}>{toast.title}</p>
            {toast.detail && (
              <p className={`mt-0.5 text-xs ${toastTextColor} opacity-90`}>{toast.detail}</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C]">滑轮组张力报告生成</h2>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          录入测量值，自动计算张力并生成可追溯报告
        </p>
      </div>

      {validationErrors.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {validationErrors.map((e) => (
            <span
              key={e}
              className="inline-flex items-center gap-1 rounded-md border border-[#E8A838]/30 bg-[#E8A838]/10 px-2.5 py-1 text-[11px] text-[#B07B1C]"
            >
              <AlertCircle className="h-3 w-3" />
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-6">
          <FormulaDisplay />
          <EquipmentVerify equipmentId={equipmentId} onDecision={handleDuplicateDecision} />
        </div>

        <div className="col-span-8 space-y-6">
          <div className="rounded-xl border border-[#1B3A5C]/10 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8BA3BF]">
              测量值输入
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A5A7A]">设备编号</label>
                <input
                  type="text"
                  value={equipmentId}
                  onChange={(e) => {
                    setEquipmentId(e.target.value)
                    setDuplicateDecision(null)
                  }}
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

            {duplicateRequiresDecision && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-[#C44D3F]/30 bg-[#C44D3F]/5 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C44D3F]" />
                <p className="text-xs text-[#C44D3F]">
                  设备编号存在重复记录，请在左侧「设备编号校验」中先选择
                  <span className="font-semibold"> 覆盖旧报告 </span>或
                  <span className="font-semibold"> 新建子报告</span>。
                </p>
              </div>
            )}
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
                ? generateConclusion(
                    currentTension,
                    currentBoundary,
                    duplicateDecision?.mode === 'subreport' && duplicateDecision?.existingReports[0]
                      ? `${equipmentId.trim()}-S1…`
                      : equipmentId.trim() || '（待输入设备编号）',
                    supplementaryNote
                  )
                : ''
            }
            onNoteChange={handleNoteChange}
          />

          <PageSummary report={savedReport} />

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-2 rounded-lg bg-[#2D9B83] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#248F78] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              保存报告
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                disabled={!savedReport}
                className="flex items-center gap-2 rounded-lg border border-[#1B3A5C]/15 bg-white px-5 py-2.5 text-sm font-medium text-[#1B3A5C] transition-all hover:bg-[#F8FAFB] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer className="h-4 w-4" />
                打印/导出
                {showExportMenu ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showExportMenu && savedReport && (
                <div className="absolute left-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[#1B3A5C]/10 bg-white py-1 shadow-lg animate-fadeIn">
                  <button
                    onClick={handlePrint}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#1B3A5C] transition-colors hover:bg-[#F8FAFB]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    打印为 PDF
                  </button>
                  <button
                    onClick={handleExportText}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#1B3A5C] transition-colors hover:bg-[#F8FAFB]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    导出 TXT 报告
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#1B3A5C] transition-colors hover:bg-[#F8FAFB]"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    导出 JSON 报告
                  </button>
                  <button
                    onClick={handleCopyText}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#1B3A5C] transition-colors hover:bg-[#F8FAFB]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    复制文本到剪贴板
                  </button>
                </div>
              )}
            </div>

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
