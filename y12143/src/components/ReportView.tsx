import { usePumpStore } from '@/store/usePumpStore'
import { FileText, Download, Printer } from 'lucide-react'
import type { CalculationSnapshot, Correction, ImportBatch, PipeParamsNormalized, PumpMatchResult, CalculationWarning } from '@/types'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

function WarnBadge({ severity, message }: { severity: string; message: string }) {
  const cls = severity === 'error' ? 'badge-expired' : severity === 'warning' ? 'badge-warning' : 'badge-info'
  return <span className={cls}>{message}</span>
}

function PumpRow({ pump, idx }: { pump: PumpMatchResult; idx: number }) {
  return (
    <tr className={idx % 2 === 0 ? 'bg-navy-800/30' : ''}>
      <td className="px-3 py-2 font-mono text-sm">{idx + 1}</td>
      <td className="px-3 py-2 text-sm">
        {pump.pumpName}
        {pump.isExpired && <span className="badge-expired ml-2">过期</span>}
      </td>
      <td className="px-3 py-2 font-mono text-sm text-right">{pump.ratedFlow.toFixed(1)} L/s</td>
      <td className="px-3 py-2 font-mono text-sm text-right">{pump.ratedHead.toFixed(1)} m</td>
      <td className="px-3 py-2 font-mono text-sm text-right">{(pump.efficiency * 100).toFixed(0)}%</td>
      <td className="px-3 py-2 text-sm text-right">
        <span className={pump.marginStatus === 'green' ? 'text-margin-green' : pump.marginStatus === 'yellow' ? 'text-margin-yellow' : 'text-margin-red'}>
          {pump.marginPercent.toFixed(1)}%
        </span>
      </td>
    </tr>
  )
}

export default function ReportView() {
  const { params, normalizedParams, currentSnapshot, corrections, importBatches, schemes } = usePumpStore()

  const handlePrint = () => window.print()
  const handleExport = () => {
    const data = {
      exportTime: new Date().toISOString(),
      params: normalizedParams,
      currentResult: currentSnapshot,
      corrections,
      importBatches: importBatches.map(b => ({ ...b })),
      schemes: schemes.map(s => ({ id: s.id, label: s.label, params: s.params, snapshot: s.snapshot })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `水泵扬程选型报告_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!currentSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-navy-300">
        <FileText size={48} className="mb-4 opacity-30" />
        <p className="text-lg">暂无计算结果，请先在工作台完成选型计算</p>
      </div>
    )
  }

  const snap = currentSnapshot as CalculationSnapshot

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:text-black print:bg-white">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold text-white print:text-black">水泵扬程选型报告</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> 导出JSON
          </button>
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> 打印/PDF
          </button>
        </div>
      </div>

      <div className="card print:border print:border-gray-300">
        <h2 className="text-lg font-bold mb-3 text-amber">一、基本参数</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200 w-40">设计流量</td>
              <td className="py-2 font-mono">{params.designFlow.value} {params.designFlow.unit}（标准化: {(normalizedParams.designFlow * 1000).toFixed(2)} L/s）</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">管径</td>
              <td className="py-2 font-mono">{params.pipeDiameter.value} {params.pipeDiameter.unit}（标准化: {(normalizedParams.pipeDiameter * 1000).toFixed(0)} mm）</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">管长</td>
              <td className="py-2 font-mono">{params.pipeLength.value} {params.pipeLength.unit}</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">静扬程</td>
              <td className="py-2 font-mono">{params.staticHead.value} {params.staticHead.unit}</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">Hazen-Williams C</td>
              <td className="py-2 font-mono">{params.hazenWilliamsC}</td>
            </tr>
            <tr>
              <td className="py-2 text-navy-200">余量系数</td>
              <td className="py-2 font-mono">{(params.marginFactor * 100).toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card print:border print:border-gray-300">
        <h2 className="text-lg font-bold mb-3 text-amber">二、计算结果</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200 w-40">流速</td>
              <td className="py-2 font-mono">{snap.velocity.toFixed(3)} m/s</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">雷诺数</td>
              <td className="py-2 font-mono">{snap.reynolds.toFixed(0)}</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">沿程水头损失</td>
              <td className="py-2 font-mono">{snap.frictionLoss.toFixed(3)} mH₂O</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">局部水头损失</td>
              <td className="py-2 font-mono">{snap.localLoss.toFixed(3)} mH₂O</td>
            </tr>
            <tr className="border-b border-navy-600/30 print:border-gray-200">
              <td className="py-2 text-navy-200">总水头损失</td>
              <td className="py-2 font-mono text-amber font-bold">{snap.totalHeadLoss.toFixed(3)} mH₂O</td>
            </tr>
            <tr>
              <td className="py-2 text-navy-200">所需扬程</td>
              <td className="py-2 font-mono text-amber font-bold text-lg">{snap.requiredHead.toFixed(2)} mH₂O</td>
            </tr>
          </tbody>
        </table>
      </div>

      {snap.warnings.length > 0 && (
        <div className="card print:border print:border-gray-300">
          <h2 className="text-lg font-bold mb-3 text-amber">三、警告信息</h2>
          <div className="flex flex-wrap gap-2">
            {snap.warnings.map((w: CalculationWarning, i: number) => (
              <WarnBadge key={i} severity={w.severity} message={w.message} />
            ))}
          </div>
        </div>
      )}

      {snap.matchedPumps.length > 0 && (
        <div className="card print:border print:border-gray-300">
          <h2 className="text-lg font-bold mb-3 text-amber">四、匹配泵型</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-400/30 text-navy-200 text-xs print:border-gray-300">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">泵型</th>
                <th className="px-3 py-2 text-right">额定流量</th>
                <th className="px-3 py-2 text-right">额定扬程</th>
                <th className="px-3 py-2 text-right">效率</th>
                <th className="px-3 py-2 text-right">余量</th>
              </tr>
            </thead>
            <tbody>
              {snap.matchedPumps.map((p: PumpMatchResult, i: number) => (
                <PumpRow key={p.pumpId} pump={p} idx={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(corrections.length > 0 || importBatches.length > 0) && (
        <div className="card print:border print:border-gray-300">
          <h2 className="text-lg font-bold mb-3 text-amber">五、操作记录</h2>
          <div className="space-y-3 text-sm">
            {importBatches.map((b: ImportBatch) => (
              <div key={b.id} className="border-l-2 border-navy-500 pl-3">
                <div className="text-navy-200">{formatTime(b.importedAt)} — 导入（{b.batchType === 'flow_and_diameter' ? '流量与管径' : '局部阻力'}）</div>
                {b.changes.map((c, i) => (
                  <div key={i} className="font-mono text-xs text-amber ml-2">
                    {c.fieldLabel}: {String(c.oldValue)} → {String(c.newValue)}
                  </div>
                ))}
              </div>
            ))}
            {corrections.map((c: Correction) => (
              <div key={c.id} className="border-l-2 border-amber pl-3">
                <div className="text-navy-200">{formatTime(c.correctedAt)} — 修正 {c.fieldLabel}</div>
                <div className="font-mono text-xs text-amber ml-2">{c.oldValue} → {c.newValue}</div>
                <div className="text-xs text-navy-300 ml-2">原因: {c.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-navy-400 pt-4 print:text-gray-400">
        报告生成时间: {new Date().toLocaleString('zh-CN', { hour12: false })}
      </div>
    </div>
  )
}
