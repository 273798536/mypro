import { useState, useMemo } from 'react'
import {
  FileDown,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Printer,
  BarChart3,
  Target,
  Activity,
  Percent,
  AlertTriangle,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import MonteCarloChart from '@/components/charts/MonteCarloChart'
import MetricCard from '@/components/ui/MetricCard'
import { useRecordStore } from '@/store/useRecordStore'
import { useFilterStore } from '@/store/useFilterStore'
import { useSimulationStore } from '@/store/useSimulationStore'
import { formatNumber, formatPercent, formatDateTime } from '@/utils/format'
import { sourceLabels, statusLabels, statusColors } from '@/data/unitConfigs'

export default function Export() {
  const { records: currentRecords, getRecordsByStatus } = useRecordStore()
  const { params: currentParams } = useFilterStore()
  const {
    result,
    params: snapshotParams,
    records: snapshotRecords,
    lastUpdated,
    isStale,
    checkConsistency,
    clearResult,
  } = useSimulationStore()

  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')

  const consistencyCheck = useMemo(() => {
    return checkConsistency(currentParams, currentRecords)
  }, [checkConsistency, currentParams, currentRecords])

  const canExport = result !== null && consistencyCheck.isConsistent

  const snapshotFilteredRecords = useMemo(() => {
    if (!snapshotRecords || !snapshotParams) return []
    return snapshotRecords.filter((r) => snapshotParams.sourceTypes.includes(r.source))
  }, [snapshotRecords, snapshotParams])

  const processedRecords = useMemo(() =>
    snapshotFilteredRecords.filter((r) => r.status === 'processed'),
    [snapshotFilteredRecords]
  )
  const pendingRecords = useMemo(() =>
    snapshotFilteredRecords.filter((r) => r.status === 'pending'),
    [snapshotFilteredRecords]
  )
  const evidenceNeededRecords = useMemo(() =>
    snapshotFilteredRecords.filter((r) => r.status === 'evidence_needed'),
    [snapshotFilteredRecords]
  )

  const displayParams = snapshotParams || currentParams
  const displayRecords = snapshotFilteredRecords.length > 0 ? snapshotFilteredRecords : []
  const displayUnit = displayParams.unit

  const handleExport = () => {
    if (!result || !snapshotParams || !snapshotRecords) {
      alert('请先在误差图表页运行模拟后再导出')
      return
    }

    if (!consistencyCheck.isConsistent) {
      alert(`数据已过期：${consistencyCheck.reason}\n请返回误差图表页重新模拟后再导出`)
      return
    }

    if (exportFormat === 'json') {
      const data = {
        generatedAt: new Date().toISOString(),
        dataTimestamp: lastUpdated,
        parameters: {
          unit: snapshotParams.unit,
          confidenceLevel: snapshotParams.confidenceLevel,
          simulationCount: snapshotParams.simulationCount,
          sourceTypes: snapshotParams.sourceTypes,
        },
        result: {
          mean: result.mean,
          stdDev: result.stdDev,
          variance: result.variance,
          confidenceInterval: result.confidenceInterval,
          relativeError: result.relativeError,
          unit: snapshotParams.unit,
        },
        records: snapshotFilteredRecords.map(r => ({
          id: r.id,
          name: r.name,
          value: r.value,
          unit: r.unit,
          error: r.error,
          source: r.source,
          sourceLabel: sourceLabels[r.source],
          status: r.status,
          statusLabel: statusLabels[r.status],
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          notes: r.notes,
        })),
        summary: {
          totalRecords: snapshotFilteredRecords.length,
          processed: processedRecords.length,
          pending: pendingRecords.length,
          evidenceNeeded: evidenceNeededRecords.length,
        },
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monte-carlo-report-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'csv') {
      const summaryRows = [
        ['# 蒙特卡洛误差分析报告 - 统计摘要', '', ''],
        ['指标', '数值', '单位'],
        ['均值', formatNumber(result.mean), snapshotParams.unit],
        ['标准差', formatNumber(result.stdDev), snapshotParams.unit],
        ['相对误差', formatPercent(result.relativeError, 2), ''],
        ['置信区间下限', formatNumber(result.confidenceInterval.lower), snapshotParams.unit],
        ['置信区间上限', formatNumber(result.confidenceInterval.upper), snapshotParams.unit],
        ['置信水平', `${(result.confidenceInterval.level * 100).toFixed(0)}`, '%'],
        ['模拟次数', snapshotParams.simulationCount.toLocaleString(), '次'],
        ['记录数量', snapshotFilteredRecords.length.toString(), '条'],
        ['生成时间', formatDateTime(new Date().toISOString()), ''],
        ['数据时间戳', lastUpdated ? formatDateTime(lastUpdated) : '', ''],
        ['', '', ''],
        ['# 数据记录明细', '', ''],
        ['名称', '数值', '单位', '误差', '来源', '状态', '创建时间', '备注'],
      ]

      const recordRows = snapshotFilteredRecords.map((r) => [
        r.name,
        r.value.toString(),
        r.unit,
        r.error.toString(),
        sourceLabels[r.source],
        statusLabels[r.status],
        formatDateTime(r.createdAt),
        r.notes || '',
      ])

      const allRows = [...summaryRows, ...recordRows]
      const csv = allRows
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monte-carlo-report-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      window.print()
    }
  }

  const emptyResult = {
    samples: [],
    mean: 0,
    stdDev: 0,
    variance: 0,
    confidenceInterval: { lower: 0, upper: 0, level: 0.95 },
    histogram: { bins: [], counts: [] },
    relativeError: 0,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 font-serif">导出报告</h1>
            <p className="text-gray-500 mt-1 text-sm">生成与屏幕显示一致的分析报告，查看处理进度</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={<Printer size={16} />} onClick={() => window.print()} disabled={!canExport}>
              打印预览
            </Button>
            <Button
              icon={<Download size={16} />}
              onClick={handleExport}
              disabled={!canExport}
            >
              导出报告
            </Button>
          </div>
        </div>

        {!result && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">暂无模拟数据</h3>
                <p className="text-amber-700 text-sm mt-1">
                  请先前往误差图表页运行模拟，生成数据后再导出报告。
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium mt-3"
                >
                  前往误差图表页 →
                </Link>
              </div>
            </div>
          </div>
        )}

        {result && !consistencyCheck.isConsistent && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">数据已过期，无法导出</h3>
                <p className="text-red-700 text-sm mt-1">
                  {consistencyCheck.reason}，导出的报告将与当前屏幕显示不一致。
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    返回误差图表页重新模拟 →
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<X size={14} />}
                    onClick={clearResult}
                    className="text-gray-500"
                  >
                    清除过期数据
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && isStale && consistencyCheck.isConsistent && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-800 text-sm">数据正在更新</div>
                <div className="text-xs text-amber-700 mt-0.5">
                  参数已变更，新的模拟结果即将生成...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="报告预览"
            subtitle={result && lastUpdated ? `数据时间：${formatDateTime(lastUpdated)}` : '暂无数据'}
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
                {result && lastUpdated && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    数据来源：Dashboard 页 {formatDateTime(lastUpdated)}
                  </p>
                )}
              </div>

              {result && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    <MetricCard
                      title="均值"
                      value={formatNumber(result.mean)}
                      unit={displayUnit}
                      icon={<Target size={16} />}
                    />
                    <MetricCard
                      title="标准差"
                      value={formatNumber(result.stdDev)}
                      unit={displayUnit}
                      icon={<Activity size={16} />}
                    />
                    <MetricCard
                      title="相对误差"
                      value={formatPercent(result.relativeError, 2)}
                      icon={<Percent size={16} />}
                    />
                    <MetricCard
                      title="置信区间"
                      value={`${formatNumber(result.confidenceInterval.lower)} ~ ${formatNumber(result.confidenceInterval.upper)}`}
                      unit={displayUnit}
                      icon={<BarChart3 size={16} />}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">误差分布</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <MonteCarloChart result={result} unit={displayUnit} height={200} />
                    </div>
                  </div>
                </>
              )}

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
                      {displayRecords.slice(0, 5).map((record) => (
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
                  {displayRecords.length > 5 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      ... 还有 {displayRecords.length - 5} 条记录
                    </p>
                  )}
                  {displayRecords.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                      暂无数据记录
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
                      } ${!canExport ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canExport}
                    >
                      <div className={`font-medium text-sm ${exportFormat === fmt.key ? 'text-primary-700' : 'text-gray-700'}`}>
                        {fmt.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-600 mb-1">格式说明</p>
                <ul className="space-y-1">
                  <li><strong>PDF/打印：</strong>与屏幕显示完全一致</li>
                  <li><strong>CSV：</strong>含统计摘要和记录明细，Excel 可直接打开</li>
                  <li><strong>JSON：</strong>完整结构化数据，便于程序处理</li>
                </ul>
              </div>

              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={handleExport}
                className="w-full"
                disabled={!canExport}
              >
                导出 {exportFormat.toUpperCase()}
              </Button>

              {!canExport && result && (
                <p className="text-xs text-red-500 text-center mt-2">
                  {consistencyCheck.reason}，请重新模拟后再导出
                </p>
              )}
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
                  <span className="font-semibold text-gray-800">{snapshotFilteredRecords.length} 条记录</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${snapshotFilteredRecords.length > 0 ? (processedRecords.length / snapshotFilteredRecords.length) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${snapshotFilteredRecords.length > 0 ? (pendingRecords.length / snapshotFilteredRecords.length) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${snapshotFilteredRecords.length > 0 ? (evidenceNeededRecords.length / snapshotFilteredRecords.length) * 100 : 0}%` }}
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
