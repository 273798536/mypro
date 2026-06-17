import ParamPanel from '@/components/ParamPanel'
import CompareReport from '@/components/CompareReport'
import BoundarySamples from '@/components/BoundarySamples'
import { Calculator, Download } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { downloadCsv, reasonLabelMap } from '@/utils/exportCsv'

export default function RecalcPage() {
  const { recalcResults, thresholds } = useStore()

  const handleExport = () => {
    if (recalcResults.length === 0) {
      alert('请先点击复算按钮')
      return
    }
    const thresholdConfig = thresholds.find((t) => t.parameter === '内阻安全阈值')
    const boundaryConfig = thresholds.find((t) => t.parameter === '边界样本系数')
    const unitConfig = thresholds.find((t) => t.parameter === '单位换算系数')
    const threshold = thresholdConfig?.value ?? 40
    const boundaryCoeff = boundaryConfig?.value ?? 0.95
    const unitCoeff = unitConfig?.value ?? 1000

    const infoRows: (string | number)[][] = [
      ['【复算参数配置】'],
      ['参数', '当前值', '单位'],
      ['内阻安全阈值', threshold, 'mΩ'],
      ['边界样本系数', boundaryCoeff, ''],
      ['单位换算系数', unitCoeff, 'mΩ/Ω'],
      [],
    ]

    const header = ['电池ID', '调参前(mΩ)', '调参后(mΩ)', '调参前状态', '调参后状态', '状态变化', '变化原因', '跨越边界']
    const dataRows = recalcResults.map((r) => [
      r.cellId,
      r.beforeValue,
      r.afterValue,
      r.beforeAnomaly ? '异常' : '正常',
      r.afterAnomaly ? '异常' : '正常',
      r.beforeAnomaly !== r.afterAnomaly ? (r.afterAnomaly ? '正常→异常' : '异常→正常') : '无变化',
      r.changeReason ? reasonLabelMap[r.changeReason] ?? r.changeReason : '-',
      r.crossedBoundary ? '是' : '否',
    ])
    downloadCsv([...infoRows, header, ...dataRows], `参数复算报告_${Date.now()}.csv`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-bold text-white">参数复算</h1>
            <p className="text-xs text-gray-500">调整阈值参数 → 一键复算 → 查看公式/单位/边界变化原因</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
        >
          <Download className="h-3.5 w-3.5" />
          导出CSV
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 overflow-auto border-r border-gray-800 p-4">
          <ParamPanel />
        </aside>
        <div className="flex-1 overflow-auto p-6 space-y-6" style={{ background: '#0f0f23' }}>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">调参前后对比报告</h2>
            <CompareReport />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">边界样本明细</h2>
            <BoundarySamples />
          </section>
        </div>
      </div>
    </div>
  )
}
