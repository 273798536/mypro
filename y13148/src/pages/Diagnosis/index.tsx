import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Copy,
  Trash2,
  Info,
  Lightbulb,
  TrendingUp,
  Hash,
  Clock,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useRecordStore } from '@/store/useRecordStore'
import { useFilterStore } from '@/store/useFilterStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useSimulationStore } from '@/store/useSimulationStore'
import { diagnoseJump, detectDuplicateRecords } from '@/utils/diagnosis'
import { formatNumber, formatDateTime } from '@/utils/format'
import type { DiagnosisResult, JumpCause } from '@/types'
import { sourceLabels } from '@/data/unitConfigs'

const jumpCauseLabels: Record<JumpCause | 'unknown', { label: string; color: string; icon: any }> = {
  unit: { label: '单位切换', color: 'bg-blue-100 text-blue-700', icon: Hash },
  threshold: { label: '阈值调整', color: 'bg-purple-100 text-purple-700', icon: TrendingUp },
  single_record: { label: '单条记录影响', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  unknown: { label: '原因待查', color: 'bg-gray-100 text-gray-700', icon: Info },
}

export default function Diagnosis() {
  const { records, updateRecord } = useRecordStore()
  const { params } = useFilterStore()
  const { history } = useHistoryStore()
  const { result } = useSimulationStore()

  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null)

  const filteredRecords = useMemo(() => {
    return records.filter((r) => params.sourceTypes.includes(r.source))
  }, [records, params.sourceTypes])

  useEffect(() => {
    if (!result) {
      setDiagnosis(null)
      return
    }

    let previousResult = null
    let previousParams = null
    let previousRecords = null

    if (history.length > 1) {
      const secondLatest = history[1]
      if (secondLatest) {
        previousResult = {
          mean: secondLatest.resultSnapshot.mean,
          stdDev: secondLatest.resultSnapshot.stdDev,
          confidenceInterval: {
            lower: secondLatest.resultSnapshot.confidenceInterval[0],
            upper: secondLatest.resultSnapshot.confidenceInterval[1],
            level: secondLatest.filterParams.confidenceLevel,
          },
        } as any
        previousParams = secondLatest.filterParams
        previousRecords = filteredRecords
      }
    }

    const diagResult = diagnoseJump(
      result,
      previousResult,
      params,
      previousParams,
      filteredRecords,
      previousRecords
    )

    setDiagnosis(diagResult)
  }, [result, history, params, filteredRecords])

  const duplicateRecords = useMemo(() => {
    const dupIds = detectDuplicateRecords(filteredRecords)
    return filteredRecords.filter((r) => dupIds.includes(r.id))
  }, [filteredRecords])

  const handleMarkNonDuplicate = (id: string) => {
    updateRecord(id, { isDuplicate: false })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">异常诊断</h1>
          <p className="text-gray-500 mt-1 text-sm">检测结果跳变原因、识别重复样本，提供处理建议</p>
        </div>
        <Badge variant={diagnosis?.hasJump ? 'danger' : 'success'} size="md">
          {diagnosis?.hasJump ? '存在异常' : '状态正常'}
        </Badge>
      </div>

      {!result && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">暂无模拟数据</h3>
              <p className="text-amber-700 text-sm mt-1">
                请先前往误差图表页运行模拟，生成数据后再进行诊断。
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="跳变诊断"
            subtitle="自动分析结果跳变的原因"
            icon={<AlertTriangle size={20} className="text-amber-500" />}
          >
            {diagnosis ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border ${
                    diagnosis.hasJump
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {diagnosis.hasJump ? (
                      <AlertTriangle size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium text-gray-800">
                        {diagnosis.hasJump ? '检测到结果跳变' : '结果在正常波动范围内'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {diagnosis.jumpDescription}
                      </div>
                      {diagnosis.jumpCause && (
                        <div className="mt-2">
                          <Badge variant="warning" size="sm">
                            原因：{jumpCauseLabels[diagnosis.jumpCause]?.label || '未知'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" />
                    处理建议
                  </h4>
                  <div className="space-y-2">
                    {diagnosis.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex gap-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600"
                      >
                        <span className="text-primary-500 font-medium flex-shrink-0">
                          {index + 1}.
                        </span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle size={40} className="mx-auto mb-2 opacity-50" />
                <p>暂无诊断数据</p>
              </div>
            )}
          </Card>

          <Card
            title="重复样本检测"
            subtitle={`检测到 ${duplicateRecords.length} 条疑似重复记录`}
            icon={<Copy size={20} className={duplicateRecords.length > 0 ? 'text-amber-500' : 'text-gray-400'} />}
          >
            {duplicateRecords.length > 0 ? (
              <div className="space-y-3">
                {duplicateRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Copy size={18} className="text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{record.name}</div>
                        <div className="text-xs text-gray-500">
                          {record.value} ± {record.error} {record.unit} · {sourceLabels[record.source]}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleMarkNonDuplicate(record.id)}
                      >
                        标记为非重复
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle size={40} className="mx-auto mb-2 text-green-400" />
                <p>未检测到重复样本</p>
                <p className="text-sm mt-1">所有记录数值差异均在合理范围内</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="诊断统计" icon={<Info size={20} />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">总记录数</span>
                <span className="font-semibold text-gray-800">{filteredRecords.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">疑似重复</span>
                <span className={`font-semibold ${duplicateRecords.length > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                  {duplicateRecords.length} 条
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">结果跳变</span>
                <span className={`font-semibold ${diagnosis?.hasJump ? 'text-red-600' : 'text-green-600'}`}>
                  {diagnosis?.hasJump ? '是' : '否'}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-500 mb-2">跳变原因</div>
                {diagnosis?.jumpCause ? (
                  <Badge variant="warning">{jumpCauseLabels[diagnosis.jumpCause]?.label}</Badge>
                ) : (
                  <span className="text-sm text-gray-400">无异常</span>
                )}
              </div>
            </div>
          </Card>

          <Card title="最近诊断记录" icon={<Clock size={20} />}>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无历史记录</p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="text-gray-700">模拟 #{history.length - index}</div>
                      <div className="text-xs text-gray-400">
                        {formatDateTime(item.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-gray-800">
                        {formatNumber(item.resultSnapshot.mean)}
                      </div>
                      <div className="text-xs text-gray-400">
                        ±{formatNumber(item.resultSnapshot.stdDev)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="诊断小贴士" icon={<Lightbulb size={20} className="text-amber-500" />}>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                单位切换会导致数值量级变化，属于正常现象
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                置信水平越高，置信区间越宽
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                单条高误差记录可能显著影响整体结果
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                重复样本建议保留精度最高的一条
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                口头备注类数据建议谨慎使用
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
