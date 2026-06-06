import { useState, useMemo } from 'react'
import { useApp } from '../store/AppContext'
import {
  ANOMALY_TYPE_LABELS,
  ANOMALY_STATUS_LABELS,
  SEVERITY_LABELS,
  type Anomaly,
  type AnomalyStatus
} from '../types'

export default function AnomalyPage() {
  const { state, dispatch } = useApp()
  const [filter, setFilter] = useState<AnomalyStatus | 'all'>('all')
  const [explanationDraft, setExplanationDraft] = useState('')
  const [suggestionDraft, setSuggestionDraft] = useState('')
  const [resolveNotes, setResolveNotes] = useState('')
  const [showResolveModal, setShowResolveModal] = useState(false)

  const anomalies = state.currentProfile?.anomalies || []

  const filteredAnomalies = useMemo(() => {
    if (filter === 'all') return anomalies
    return anomalies.filter(a => a.status === filter)
  }, [anomalies, filter])

  const selectedAnomaly = useMemo(() => {
    if (!state.selectedAnomalyId) return null
    return anomalies.find(a => a.id === state.selectedAnomalyId) || null
  }, [anomalies, state.selectedAnomalyId])

  const handleSelectAnomaly = (anomaly: Anomaly) => {
    dispatch({ type: 'SET_SELECTED_ANOMALY', payload: anomaly.id })
    setExplanationDraft(anomaly.explanation)
    setSuggestionDraft(anomaly.suggestion)
  }

  const handleSaveExplanation = () => {
    if (!selectedAnomaly) return
    dispatch({
      type: 'UPDATE_ANOMALY_EXPLANATION',
      payload: {
        anomalyId: selectedAnomaly.id,
        explanation: explanationDraft,
        suggestion: suggestionDraft
      }
    })
  }

  const handleResolve = () => {
    if (!selectedAnomaly) return
    dispatch({
      type: 'RESOLVE_ANOMALY',
      payload: { anomalyId: selectedAnomaly.id, notes: resolveNotes }
    })
    setShowResolveModal(false)
    setResolveNotes('')
  }

  const handleIgnore = () => {
    if (!selectedAnomaly) return
    dispatch({
      type: 'IGNORE_ANOMALY',
      payload: { anomalyId: selectedAnomaly.id }
    })
  }

  const getSeverityStyle = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const getSeverityBadgeStyle = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-yellow-500 text-white'
      case 'low':
        return 'bg-green-500 text-white'
    }
  }

  const getStatusStyle = (status: AnomalyStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-700'
      case 'resolved':
        return 'bg-green-100 text-green-700'
      case 'ignored':
        return 'bg-gray-100 text-gray-600'
    }
  }

  if (!state.currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stratum-bg">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-stratum-dark mb-2">请先加载数据</h2>
          <p className="text-stratum-mid text-sm">请先从启动页面导入或创建岩层剖面数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-stratum-bg">
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stratum-dark">异常追踪</h1>
            <p className="text-sm text-stratum-mid mt-0.5">
              共 {anomalies.length} 处异常，待处理 {anomalies.filter(a => a.status === 'pending').length} 处
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] flex flex-col bg-white border-r border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
            {(['all', 'pending', 'resolved', 'ignored'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-stratum-alert text-white'
                    : 'bg-gray-100 text-stratum-mid hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? '全部' : ANOMALY_STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-8 text-stratum-mid text-sm">
                暂无符合条件的异常
              </div>
            ) : (
              filteredAnomalies.map(anomaly => (
                <div
                  key={anomaly.id}
                  onClick={() => handleSelectAnomaly(anomaly)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAnomaly?.id === anomaly.id
                      ? 'border-stratum-alert bg-orange-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-stratum-dark text-sm">
                      {ANOMALY_TYPE_LABELS[anomaly.type]}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityStyle(anomaly.severity)} border`}>
                      {SEVERITY_LABELS[anomaly.severity]}
                    </span>
                  </div>
                  <p className="text-sm text-stratum-mid line-clamp-2 mb-3">
                    {anomaly.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(anomaly.status)}`}>
                      {ANOMALY_STATUS_LABELS[anomaly.status]}
                    </span>
                    <span className="text-xs text-stratum-mid">
                      {anomaly.createdAt.toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedAnomaly ? (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-stratum-dark flex items-center gap-3">
                      {ANOMALY_TYPE_LABELS[selectedAnomaly.type]}
                      <span className={`px-2.5 py-1 rounded text-xs font-medium ${getSeverityBadgeStyle(selectedAnomaly.severity)}`}>
                        {SEVERITY_LABELS[selectedAnomaly.severity]}
                      </span>
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs ${getStatusStyle(selectedAnomaly.status)}`}>
                        {ANOMALY_STATUS_LABELS[selectedAnomaly.status]}
                      </span>
                      <span className="text-xs text-stratum-mid">
                        创建于 {selectedAnomaly.createdAt.toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-stratum-dark mb-2">问题描述</h3>
                  <p className="text-sm text-stratum-mid leading-relaxed">
                    {selectedAnomaly.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-stratum-dark">讲解备注</h3>
                    <button
                      onClick={handleSaveExplanation}
                      className="px-3 py-1 bg-stratum-alert text-white text-xs rounded-lg hover:opacity-90 transition-opacity"
                    >
                      保存备注
                    </button>
                  </div>
                  <textarea
                    value={explanationDraft}
                    onChange={e => setExplanationDraft(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-stratum-dark focus:outline-none focus:ring-2 focus:ring-stratum-alert focus:border-transparent resize-none"
                    placeholder="输入讲解备注..."
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-stratum-dark mb-2">处理意见</h3>
                  <textarea
                    value={suggestionDraft}
                    onChange={e => setSuggestionDraft(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-stratum-dark focus:outline-none focus:ring-2 focus:ring-stratum-alert focus:border-transparent resize-none"
                    placeholder="输入处理意见..."
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-stratum-dark mb-4">追溯链路</h3>
                  {selectedAnomaly.traceChain && selectedAnomaly.traceChain.processingHistory.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {selectedAnomaly.traceChain.processingHistory.map((step, idx) => (
                          <div key={idx} className="relative flex gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                              idx === 0 ? 'bg-stratum-alert text-white' : 'bg-gray-100 text-stratum-mid border border-gray-200'
                            }`}>
                              {step.step}
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-stratum-dark">{step.action}</span>
                                <span className="text-xs text-stratum-mid">
                                  {new Date(step.timestamp).toLocaleString('zh-CN')}
                                </span>
                              </div>
                              <div className="text-xs text-stratum-mid">
                                操作人：{step.operator}
                              </div>
                              {step.notes && (
                                <div className="text-xs text-stratum-mid mt-1 pt-1 border-t border-gray-200">
                                  备注：{step.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="text-sm text-stratum-mid">暂无追溯链路信息</p>
                    </div>
                  )}
                </div>

                {selectedAnomaly.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="flex-1 px-4 py-2.5 bg-stratum-success text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      ✅ 标记已处理
                    </button>
                    <button
                      onClick={handleIgnore}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-stratum-dark rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      ⏭️ 标记忽略
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">👈</div>
                <h3 className="text-lg font-semibold text-stratum-dark mb-1">选择异常</h3>
                <p className="text-sm text-stratum-mid">请从左侧列表选择一个异常查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showResolveModal && selectedAnomaly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[440px] max-w-[90vw]">
            <h3 className="text-lg font-bold text-stratum-dark mb-4">标记已处理</h3>
            <p className="text-sm text-stratum-mid mb-3">
              请输入处理备注（可选）：
            </p>
            <textarea
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-stratum-dark focus:outline-none focus:ring-2 focus:ring-stratum-alert focus:border-transparent resize-none mb-4"
              placeholder="描述处理方式和结果..."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowResolveModal(false)
                  setResolveNotes('')
                }}
                className="px-4 py-2 bg-gray-100 text-stratum-dark rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-stratum-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                确认处理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
