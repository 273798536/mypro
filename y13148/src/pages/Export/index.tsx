import { useState, useMemo } from 'react'
import {
  FileDown,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Copy,
  Printer,
  BarChart3,
  Target,
  Activity,
  Percent,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import MonteCarloChart from '@/components/charts/MonteCarloChart'
import MetricCard from '@/components/ui/MetricCard'
import { useRecordStore } from '@/store/useRecordStore'
import { useFilterStore } from '@/store/useFilterStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { runMonteCarloSimulation } from '@/utils/monteCarlo'
import { formatNumber, formatPercent, formatDateTime } from '@/utils/format'
import { sourceLabels, statusLabels, statusColors } from '@/data/unitConfigs'
import type { DataRecord, RecordStatus } from '@/types'

export default function Export() {
  const { records, getRecordsByStatus } = useRecordStore()
  const { params } = useFilterStore()
  const { history } = useHistoryStore()
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')

  const filteredRecords = useMemo(() => {
    return records.filter((r) => params.sourceTypes.includes(r.source))
  }, [records, params.sourceTypes])

  const simResult = useMemo(() => {
    return runMonteCarloSimulation(
      filteredRecords,
      params.simulationCount,
      params.unit,
      params.confidenceLevel
    )
  }, [filteredRecords, params])

  const processedRecords = getRecordsByStatus('processed')
  const pendingRecords = getRecordsByStatus('pending')
  const evidenceNeededRecords = getRecordsByStatus('evidence_needed')

  const handleExport = () => {
    if (exportFormat === 'json') {
      const data = {
        generatedAt: new Date().toISOString(),
        parameters: params,
        result: {
          mean: simResult.mean,
          stdDev: simResult.stdDev,
          variance: simResult.variance,
          confidenceInterval: simResult.confidenceInterval,
          relativeError: simResult.relativeError,
        },
        records: filteredRecords,
        summary: {
          totalRecords: filteredRecords.length,
          processed: processedRecords.length,
          pending: pendingRecords.length,
          evidenceNeeded: evidenceNeededRecords.length,
        },
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monte-carlo-report-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'csv') {
      const headers = ['名称', '数值', '单位', '误差', '来源', '状态', '创建时间', '备注']
      const rows = filteredRecords.map((r) => [
        r.name,
        r.value,
        r.unit,
        r.error,
        sourceLabels[r.source],
        statusLabels[r.status],
        formatDateTime(r.createdAt),
        r.notes,
      ])
      const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monte-carlo-data-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      window.print()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">导出报告</h1>
          <p className="text-gray-500 mt-1 text-sm">生成与屏幕显示一致的分析报告，查看处理进度</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Printer size={16} />} onClick={() => window.print()}>
            打印预览
          </Button>
          <Button icon={<Download size={16} />} onClick={handleExport}>
            导出报告
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="报告预览"
            subtitle="导出内容与屏幕显示完全一致"
            icon={<FileText size={20} />}
          >
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-serif font-semibold text-gray-800">
                  蒙特卡洛误差分析报告
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  生成时间：{formatDateTime(new Date().toISOString())}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <MetricCard
                  title="均值"
                  value={formatNumber(simResult.mean)}
                  unit={params.unit}
                  icon={<Target size={16} />}
                />
                <MetricCard
                  title="标准差"
                  value={formatNumber(simResult.stdDev)}
                  unit={params.unit}
                  icon={<Activity size={16} />}
                />
                <MetricCard
                  title="相对误差"
                  value={formatPercent(simResult.relativeError, 2)}
                  icon={<Percent size={16} />}
                />
                <MetricCard
                  title="置信区间"
                  value={`${formatNumber(simResult.confidenceInterval.lower)} ~ ${formatNumber(simResult.confidenceInterval.upper)}`}
                  unit={params.unit}
                  icon={<BarChart3 size={16} />}
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">误差分布</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <MonteCarloChart result={simResult} unit={params.unit} height={200} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">数据记录明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">名称</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">数值</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">误差</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">来源</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredRecords.slice(0, 5).map((record) => (
                        <tr key={record.id}>
                          <td className="py-2 px-3 text-gray-700">{record.name}</td>
                          <td className="py-2 px-3 font-mono text-gray-700">
                            {record.value} {record.unit}
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-700">
                            ±{record.error}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-gray-500">{sourceLabels[record.source]}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs ${statusColors[record.status].split(' ')[0]} ${statusColors[record.status].split(' ')[1]}`}>
                              {statusLabels[record.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRecords.length > 5 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      ... 还有 {filteredRecords.length - 5} 条记录
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="导出设置"
            icon={<FileDown size={20} />}
          >
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  导出格式
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'pdf', label: 'PDF', desc: '打印' },
                    { key: 'csv', label: 'CSV', desc: '表格' },
                    { key: 'json', label: 'JSON', desc: '数据' },
                  ].map((fmt) => (
                    <button
                      key={fmt.key}
                      onClick={() => setExportFormat(fmt.key as any)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        exportFormat === fmt.key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`font-medium text-sm ${exportFormat === fmt.key ? 'text-primary-700' : 'text-gray-700'}`}>
                        {fmt.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={handleExport}
                className="w-full"
              >
                导出 {exportFormat.toUpperCase()}
              </Button>
            </div>
          </Card>

          <Card
            title="处理进度汇总"
            subtitle="负责人一目了然"
            icon={<Clock size={20} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-green-500" />
                  <div>
                    <div className="font-medium text-green-800">已处理</div>
                    <div className="text-xs text-green-600">数据完整，可用于报告</div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-700">
                  {processedRecords.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-blue-500" />
                  <div>
                    <div className="font-medium text-blue-800">处理中</div>
                    <div className="text-xs text-blue-600">正在核对数据</div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-700">
                  {pendingRecords.length}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-amber-500" />
                  <div>
                    <div className="font-medium text-amber-800">待补证据</div>
                    <div className="text-xs text-amber-600">需要补充原始数据</div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-700">
                  {evidenceNeededRecords.length}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">总计</span>
                  <span className="font-semibold text-gray-800">{records.length} 条记录</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${records.length > 0 ? (processedRecords.length / records.length) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${records.length > 0 ? (pendingRecords.length / records.length) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${records.length > 0 ? (evidenceNeededRecords.length / records.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="待补证据清单" icon={<AlertCircle size={20} className="text-amber-500" />}>
            {evidenceNeededRecords.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                <p className="text-sm">全部记录均已处理</p>
              </div>
            ) : (
              <div className="space-y-2">
                {evidenceNeededRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2.5 bg-amber-50 rounded text-sm"
                  >
                    <div className="truncate flex-1">
                      <span className="text-gray-700">{record.name}</span>
                    </div>
                    <Badge variant="warning" size="sm">待补</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
