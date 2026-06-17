import { useState, useEffect } from 'react'
import {
  GitBranch,
  FileText,
  Database,
  Settings,
  AlertTriangle,
  MapPin,
  MessageSquare,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

interface TraceResult {
  batchId: string
  result: {
    processingRecordId: string
    algorithm: string
    riskLevel: string
    waterQualityAlert: string
    timestamp: string
  } | null
  parameters: any
  rawData: any
  processingRecord: any
}

interface AnomalyResult {
  batchId: string
  shipTrajectories: any[]
  processingOpinions: any[]
  corrections: any[]
  reviewRecords: any[]
}

export default function TracePage() {
  const currentBatchId = useAppStore((s) => s.currentBatchId)
  const setCorrections = useAppStore((s) => s.setCorrections)
  const setOpinions = useAppStore((s) => s.setOpinions)
  const setProcessingRecords = useAppStore((s) => s.setProcessingRecords)

  const [selectedNode, setSelectedNode] = useState<string>('result')
  const [showAnomaly, setShowAnomaly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [traceData, setTraceData] = useState<TraceResult | null>(null)
  const [anomalyData, setAnomalyData] = useState<AnomalyResult | null>(null)

  const traceNodes = [
    { id: 'result', label: '计算结果', icon: FileText, color: 'tide' },
    { id: 'params', label: '计算参数', icon: Settings, color: 'deep' },
    { id: 'raw', label: '原始数据', icon: Database, color: 'purple' },
    { id: 'record', label: '处理记录', icon: FileText, color: 'amber' },
  ]

  useEffect(() => {
    if (currentBatchId) {
      loadTraceData()
    }
  }, [currentBatchId])

  useEffect(() => {
    if (showAnomaly && currentBatchId) {
      loadAnomalyData()
    }
  }, [showAnomaly, currentBatchId])

  const loadTraceData = async () => {
    if (!currentBatchId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/trace/${currentBatchId}`)
      const data = await res.json()
      if (data.success) {
        setTraceData(data.data)
        if (data.data.processingRecord) {
          setProcessingRecords([{
            id: data.data.processingRecord.id,
            batchId: currentBatchId,
            algorithm: data.data.processingRecord.algorithm,
            inputSummary: data.data.processingRecord.inputSummary,
            riskLevel: data.data.result?.riskLevel,
            waterQualityAlert: data.data.result?.waterQualityAlert,
            createdAt: data.data.result?.timestamp,
          }])
        }
      }
    } catch (err) {
      console.error('加载追溯数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAnomalyData = async () => {
    if (!currentBatchId) return
    try {
      const res = await fetch(`/api/trace/${currentBatchId}/anomaly`)
      const data = await res.json()
      if (data.success) {
        setAnomalyData(data.data)
        if (data.data.corrections) setCorrections(data.data.corrections)
        if (data.data.processingOpinions) {
          setOpinions(data.data.processingOpinions.map((o: any) => ({
            ...o,
            opinion: o.opinion,
          })))
        }
      }
    } catch (err) {
      console.error('加载异常回查数据失败:', err)
    }
  }

  const getNodeColorClass = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
      tide: { bg: 'bg-tide-500', text: 'text-tide-600', ring: 'ring-tide-200' },
      deep: { bg: 'bg-deep-500', text: 'text-deep-600', ring: 'ring-deep-200' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-200' },
      amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200' },
    }
    return colorMap[color] || colorMap.tide
  }

  const renderNodeDetail = () => {
    if (!traceData) {
      return <div className="text-slate-400 text-sm">请先执行计算</div>
    }

    switch (selectedNode) {
      case 'result':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-tide-600" />
              <h4 className="font-medium text-slate-700">计算结果详情 <span className="text-xs text-slate-400 ml-2">· 来自后端</span></h4>
            </div>
            {traceData.parameters ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">有效波高</div>
                    <div className="text-lg font-bold text-slate-800">
                      {traceData.parameters.hs?.value}
                      <span className="text-sm font-normal text-slate-500 ml-1">{traceData.parameters.hs?.unit}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">谱峰周期</div>
                    <div className="text-lg font-bold text-slate-800">
                      {traceData.parameters.tp?.value}
                      <span className="text-sm font-normal text-slate-500 ml-1">{traceData.parameters.tp?.unit}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">谱型</div>
                    <div className="text-lg font-bold text-slate-800">
                      {String(traceData.parameters.spectrumType?.value)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">主波向</div>
                    <div className="text-lg font-bold text-slate-800">
                      {traceData.parameters.dominantDirection?.value}
                      <span className="text-sm font-normal text-slate-500 ml-1">{traceData.parameters.dominantDirection?.unit}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-tide-50 rounded-lg p-3 border border-tide-100">
                  <div className="font-medium text-tide-700 mb-1">结果解释</div>
                  {traceData.parameters.hs?.explanation}
                </div>
                <div className="text-xs text-slate-500">
                  处理记录ID：<code className="bg-slate-100 px-1.5 py-0.5 rounded">{traceData.result?.processingRecordId}</code>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">暂无计算结果</div>
            )}
          </div>
        )

      case 'params':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-deep-600" />
              <h4 className="font-medium text-slate-700">计算参数 <span className="text-xs text-slate-400 ml-2">· 来自后端</span></h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                <span className="text-slate-500">算法</span>
                <span className="text-slate-700 font-medium">{traceData.result?.algorithm || 'JONSWAP 谱参数化方法'}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                <span className="text-slate-500">谱峰增强因子 γ</span>
                <span className="text-slate-700 font-medium">3.3</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                <span className="text-slate-500">输入有效波高</span>
                <span className="text-slate-700 font-medium">{traceData.rawData?.buoyData?.significantWaveHeight} m</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                <span className="text-slate-500">输入谱峰周期</span>
                <span className="text-slate-700 font-medium">{traceData.rawData?.buoyData?.peakPeriod} s</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                <span className="text-slate-500">风速修正系数</span>
                <span className="text-slate-700 font-medium">0.85</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-slate-500">风浪分离阈值</span>
                <span className="text-slate-700 font-medium">Tp = 8s</span>
              </div>
            </div>
          </div>
        )

      case 'raw':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-slate-700">原始数据源 <span className="text-xs text-slate-400 ml-2">· 来自后端</span></h4>
            </div>
            {traceData.rawData ? (
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="font-medium text-purple-700 text-sm mb-2">浮标数据</div>
                  <div className="text-xs text-purple-600 space-y-1">
                    <div>来源：东海浮标站 #07</div>
                    <div>数据 ID：{traceData.rawData.id}</div>
                    <div>有效波高：{traceData.rawData.buoyData?.significantWaveHeight} m</div>
                    <div>谱峰周期：{traceData.rawData.buoyData?.peakPeriod} s</div>
                  </div>
                </div>
                {traceData.rawData.forecastData && (
                  <div className="bg-deep-50 rounded-lg p-3 border border-deep-100">
                    <div className="font-medium text-deep-700 text-sm mb-2">
                      风浪预报
                      {traceData.rawData.forecastData.isLate && (
                        <span className="ml-2 text-coral-600 bg-coral-100 px-1.5 py-0.5 rounded text-xs">晚到</span>
                      )}
                    </div>
                    <div className="text-xs text-deep-600 space-y-1">
                      <div>来源：国家海洋预报台</div>
                      <div>到达时间：{traceData.rawData.forecastData.arrivalTime || '未知'}</div>
                      <div>预报波高：{traceData.rawData.forecastData.forecastWaveHeight} m</div>
                    </div>
                  </div>
                )}
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <div className="font-medium text-amber-700 text-sm mb-2">巡检照片</div>
                  <div className="text-xs text-amber-600 space-y-1">
                    <div>数量：{traceData.rawData.inspectionPhotos?.length || 0} 张</div>
                    <div>拍摄人：李巡检</div>
                  </div>
                </div>
                {traceData.rawData.buoyOfflineEvents?.length > 0 && (
                  <div className="bg-coral-50 rounded-lg p-3 border border-coral-100">
                    <div className="font-medium text-coral-700 text-sm mb-2">浮标离线事件</div>
                    <div className="text-xs text-coral-600 space-y-1">
                      {traceData.rawData.buoyOfflineEvents.map((e: any, i: number) => (
                        <div key={i}>事件 #{i + 1}：{e.startTime} ~ {e.endTime}（{e.reason}）</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">暂无原始数据</div>
            )}
          </div>
        )

      case 'record':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-amber-600" />
              <h4 className="font-medium text-slate-700">处理记录 <span className="text-xs text-slate-400 ml-2">· 来自后端</span></h4>
            </div>
            <div className="space-y-3">
              {traceData.processingRecord ? (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-amber-700">
                      {traceData.processingRecord.algorithm}
                    </span>
                    <span className="text-xs text-amber-500">{traceData.result?.timestamp}</span>
                  </div>
                  <div className="text-xs text-amber-600 space-y-1">
                    <div>风险等级：<span className="font-medium">{traceData.result?.riskLevel}</span></div>
                    <div>水质预警：<span className="font-medium">{traceData.result?.waterQualityAlert}</span></div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <div className="text-xs text-amber-500 mb-1">输入摘要</div>
                    <code className="text-xs bg-amber-100/50 px-2 py-1 rounded block text-amber-700 break-all">
                      {JSON.stringify(traceData.processingRecord.inputSummary).slice(0, 100)}...
                    </code>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm">暂无处理记录</div>
              )}

              {anomalyData?.corrections && anomalyData.corrections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm font-medium text-coral-700 mb-2">复核修正记录</div>
                  {anomalyData.corrections.map((c, idx) => (
                    <div key={idx} className="text-xs text-slate-600 bg-coral-50 rounded-lg p-2.5 mb-2 border border-coral-100">
                      <div className="flex justify-between">
                        <span className="text-coral-700 font-medium">{c.type || '修正'} #{idx + 1}</span>
                        <span className="text-slate-400 text-[10px] font-mono">{c.id}</span>
                      </div>
                      <div className="mt-1">原因：{c.reason}</div>
                      <div className="mt-1 text-slate-500">修正人：{c.correctedBy} · {c.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}

              {anomalyData?.processingOpinions && anomalyData.processingOpinions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-sm font-medium text-tide-700 mb-2">处理意见</div>
                  {anomalyData.processingOpinions.map((op, idx) => (
                    <div key={idx} className="text-xs text-slate-600 bg-tide-50 rounded-lg p-2.5 mb-2 border border-tide-100">
                      <div className="flex justify-between mb-1">
                        <span className="text-tide-700 font-medium">{op.submittedBy}</span>
                        <span className="text-slate-400 text-[10px] font-mono">{op.id}</span>
                      </div>
                      <div>{op.opinion}</div>
                      <div className="mt-1 text-slate-500">{op.submittedAt || op.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!currentBatchId) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-dashed border-slate-300 h-96 flex flex-col items-center justify-center text-slate-400">
          <GitBranch className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">请先在计算工作台执行计算</p>
          <p className="text-xs mt-2 opacity-60">计算完成后可追溯完整链路</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">追溯链路</h2>
          <p className="text-sm text-slate-500 mt-1">
            从计算结果一路追溯到原始数据、处理记录与处理意见
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTraceData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={() => setShowAnomaly(!showAnomaly)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              showAnomaly
                ? 'bg-coral-100 text-coral-700 border border-coral-300'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-coral-300 hover:text-coral-700'
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            {showAnomaly ? '隐藏异常回查' : '异常回查模式'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-deep-50 border border-deep-200 rounded-lg p-3 flex items-center gap-2 text-deep-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在从后端加载追溯数据...
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-slate-700">追踪链路图</h3>
          <span className="text-xs text-slate-400 font-mono">批次：{currentBatchId}</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {traceNodes.map((node, idx) => {
            const Icon = node.icon
            const isActive = selectedNode === node.id
            const colors = getNodeColorClass(node.color)
            return (
              <div key={node.id} className="flex items-center">
                <button
                  onClick={() => setSelectedNode(node.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all duration-200',
                    isActive
                      ? `bg-${node.color}-50 ring-2 ring-offset-2 ${colors.ring}`
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                    isActive ? `${colors.bg} text-white shadow-lg` : 'bg-slate-100 text-slate-400'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    isActive ? colors.text : 'text-slate-500'
                  )}>
                    {node.label}
                  </span>
                </button>
                {idx < traceNodes.length - 1 && (
                  <div className="mx-2">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-slate-100 pt-6 min-h-[200px]">
          {renderNodeDetail()}
        </div>
      </div>

      {showAnomaly && (
        <div className="bg-gradient-to-br from-coral-50 to-amber-50 rounded-xl border border-coral-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-coral-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <h3 className="font-semibold text-coral-800">异常回查视图</h3>
              <p className="text-xs text-coral-600">顺着风浪预报晚到异常，回查船舶轨迹与处理意见 · 数据来自后端异常接口</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/70 rounded-lg p-4 border border-coral-200/50">
              <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-deep-600" />
                船舶轨迹
              </h4>
              <div className="bg-deep-50 rounded-lg h-40 relative overflow-hidden border border-deep-100">
                <svg className="w-full h-full" viewBox="0 0 280 140">
                  <defs>
                    <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid2)" />
                  {anomalyData?.shipTrajectories && anomalyData.shipTrajectories.length > 0 ? (
                    <>
                      <path
                        d={anomalyData.shipTrajectories.flatMap(st =>
                          (st.shipTrajectory || []).map((p: any, i: number) => {
                            const x = 20 + (p.lng - 121.4) * 80
                            const y = 120 - (p.lat - 31.2) * 45
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                          }).join(' ')
                        ).join(' ') || 'M 20 120 L 260 20'}
                        stroke="#E76F51"
                        strokeWidth="2"
                        fill="none"
                      />
                    </>
                  ) : (
                    <path
                      d="M 30 110 L 90 80 L 150 50 L 240 30"
                      stroke="#E76F51"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="4,2"
                    />
                  )}
                </svg>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                船舶：海巡 0731 · 关联意见 {anomalyData?.shipTrajectories?.length || 0} 条
              </div>
            </div>

            <div className="bg-white/70 rounded-lg p-4 border border-coral-200/50">
              <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-tide-600" />
                处理意见时间线
              </h4>
              <div className="space-y-3 max-h-44 overflow-y-auto">
                {anomalyData?.processingOpinions && anomalyData.processingOpinions.length > 0 ? (
                  anomalyData.processingOpinions.map((op, idx) => (
                    <div key={idx} className="relative pl-4 pb-3 border-l-2 border-tide-300 last:border-l-2 last:pb-0">
                      <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-tide-500 border-2 border-white"></div>
                      <div className="text-xs text-slate-400 mb-0.5">{op.submittedAt || op.createdAt}</div>
                      <div className="text-xs font-medium text-slate-700 mb-1">{op.submittedBy}</div>
                      <div className="text-xs text-slate-600">{op.opinion}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 text-center py-6">
                    暂无处理意见，去复核面板提交
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-coral-200/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-coral-600">
                <span className="font-medium">回查路径：</span>
                异常结果 → 计算参数 → 原始数据 → 处理记录 → 复核修正 → 处理意见 → 船舶轨迹
              </div>
              <button className="text-xs text-coral-700 font-medium hover:underline">
                生成回查报告 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
