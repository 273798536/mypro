import React, { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import type { AnomalyType } from '../types'
import SettlementPage from './SettlementPage'

const AnnotationWorkspace: React.FC = () => {
  const {
    currentLevel,
    annotations,
    layers,
    history,
    historyIndex,
    selectedPoint,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    updateZoneStatus,
    undo,
    redo,
    completeLevel,
    resetLevel,
    setCurrentLevel,
    selectPoint,
    toggleLayerVisibility,
    recordBoundaryFailure
  } = useStore()

  const [selectedType, setSelectedType] = useState<AnomalyType>('boundary_violation')
  const [commentInput, setCommentInput] = useState('')
  const [showTooltip, setShowTooltip] = useState<{ x: number; y: number; point: any } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [showHints, setShowHints] = useState(false)

  if (!currentLevel) return null

  if (useStore.getState().isCompleted && useStore.getState().settlement) {
    return <SettlementPage />
  }

  const anomalyTypes: { type: AnomalyType; label: string; color: string }[] = [
    { type: 'boundary_violation', label: '边界违规', color: '#ef4444' },
    { type: 'gps_drift', label: 'GPS漂移', color: '#8b5cf6' },
    { type: 'duplicate_point', label: '重复点', color: '#f59e0b' },
    { type: 'speed_anomaly', label: '速度异常', color: '#06b6d4' },
    { type: 'missing_data', label: '数据缺失', color: '#6b7280' }
  ]

  const trajectoryLayer = layers.find(l => l.type === 'trajectory')
  const allPoints = trajectoryLayer?.points || currentLevel.trajectoryPoints || currentLevel.trajectoryData

  const handlePointClick = (point: any, e: React.MouseEvent) => {
    e.stopPropagation()
    selectPoint(point)
  }

  const handleAddAnnotation = () => {
    if (!selectedPoint) return
    addAnnotation(selectedPoint.id, selectedType, commentInput)
    setCommentInput('')
  }

  const handleZoneStatusChange = (zoneId: string, status: 'confirmed' | 'rejected') => {
    updateZoneStatus(zoneId, status)
    if (status === 'rejected') {
      recordBoundaryFailure({
        pointId: zoneId,
        reason: '区域被驳回，疑似边界判定失败'
      })
    }
  }

  const handleUndo = () => undo()
  const handleRedo = () => redo()

  const handleReset = () => {
    if (window.confirm('确定要重开本关卡吗？所有标注将被清除。')) {
      resetLevel()
    }
  }

  const handleComplete = () => {
    const hasPending =
      currentLevel.correctionZones.some(z => z.status === 'pending') ||
      annotations.some(a => a.status === 'pending')
    if (hasPending && !window.confirm('还有标注/区域未确认，确定要完成吗？')) {
      return
    }
    completeLevel()
  }

  const getZoneColor = (type: string, status: string) => {
    if (status === 'confirmed') return 'rgba(34, 197, 94, 0.3)'
    if (status === 'rejected') return 'rgba(239, 68, 68, 0.3)'
    switch (type) {
      case 'boundary': return 'rgba(249, 115, 22, 0.3)'
      case 'collision': return 'rgba(239, 68, 68, 0.3)'
      default: return 'rgba(59, 130, 246, 0.3)'
    }
  }

  const getZoneBorderColor = (type: string, status: string) => {
    if (status === 'confirmed') return '#22c55e'
    if (status === 'rejected') return '#ef4444'
    switch (type) {
      case 'boundary': return '#f97316'
      case 'collision': return '#ef4444'
      default: return '#3b82f6'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">待确认</span>
      case 'confirmed': return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">已确认</span>
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">已驳回</span>
      case 'needs_review': return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">需复核</span>
      default: return null
    }
  }

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1

  const existingAnnotation = selectedPoint
    ? annotations.find(a => a.pointId === selectedPoint.id)
    : null

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentLevel(null)}
              className="text-slate-600 hover:text-slate-800"
            >
              ← 返回关卡列表
            </button>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{currentLevel.name}</h2>
              <p className="text-sm text-slate-600">{currentLevel.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                canUndo
                  ? 'border-slate-300 hover:bg-slate-50 text-slate-700'
                  : 'border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              ↶ 撤销
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                canRedo
                  ? 'border-slate-300 hover:bg-slate-50 text-slate-700'
                  : 'border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              ↷ 重做
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              重开
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              完成标注
            </button>
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto p-6 gap-6">
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="relative">
              <svg
                ref={svgRef}
                width="100%"
                height="520"
                className="cursor-crosshair"
              >
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                <image
                  href={currentLevel.baseImage}
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid slice"
                  opacity="0.35"
                />

                {currentLevel.boundaries.map((boundary, bi) => (
                  <polygon
                    key={bi}
                    points={boundary.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(239, 68, 68, 0.08)"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="8 4"
                  />
                ))}

                {currentLevel.correctionZones.map((zone) => (
                  <g key={zone.id}>
                    <polygon
                      points={zone.points.map(p => p.join(',')).join(' ')}
                      fill={getZoneColor(zone.type, zone.status)}
                      stroke={getZoneBorderColor(zone.type, zone.status)}
                      strokeWidth="2"
                    />
                    <text
                      x={zone.points[0][0]}
                      y={zone.points[0][1] - 5}
                      fontSize="12"
                      fill={getZoneBorderColor(zone.type, zone.status)}
                      fontWeight="bold"
                    >
                      {zone.label}
                    </text>
                  </g>
                ))}

                {allPoints.length > 1 && (
                  <polyline
                    points={allPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                  />
                )}

                {allPoints.map((point) => {
                  const ann = annotations.find(a => a.pointId === point.id)
                  const isSelected = selectedPoint?.id === point.id
                  const fillColor = ann
                    ? anomalyTypes.find(t => t.type === ann.type)?.color || '#3b82f6'
                    : point.isAnomaly ? '#fbbf24' : '#3b82f6'

                  return (
                    <g
                      key={point.id}
                      onClick={(e) => handlePointClick(point, e)}
                      onMouseEnter={() => setShowTooltip({ x: point.x, y: point.y, point })}
                      onMouseLeave={() => setShowTooltip(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx={point.x} cy={point.y} r={isSelected ? 10 : 7} fill={fillColor} />
                      <circle cx={point.x} cy={point.y} r="3" fill="white" />
                      {isSelected && (
                        <circle cx={point.x} cy={point.y} r="14" fill="none" stroke="#1e40af" strokeWidth="2" />
                      )}
                    </g>
                  )
                })}
              </svg>

              {showTooltip && (
                <div
                  className="absolute bg-white rounded-lg shadow-lg p-3 text-sm z-10 pointer-events-none"
                  style={{
                    left: Math.min(showTooltip.x + 20, 500),
                    top: Math.max(showTooltip.y - 60, 10)
                  }}
                >
                  <div className="font-medium text-slate-800">{showTooltip.point.sourceNote}</div>
                  <div className="text-slate-600 text-xs">{showTooltip.point.timestamp}</div>
                  {(showTooltip.point.originalLineNumber ?? showTooltip.point.rowNumber) != null && (
                    <div className="text-slate-500 text-xs">
                      原始行号: #{showTooltip.point.originalLineNumber ?? showTooltip.point.rowNumber}
                    </div>
                  )}
                  {(showTooltip.point.sourceImage ?? showTooltip.point.imageName) && (
                    <div className="text-slate-500 text-xs">
                      截图: {showTooltip.point.sourceImage ?? showTooltip.point.imageName}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-slate-800">图层管理</h3>
              <button
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setShowHints(v => !v)}
              >
                {showHints ? '收起提示' : '查看提示'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {layers.filter(l => l.type !== 'annotation').map(layer => (
                <label key={layer.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayerVisibility(layer.id)}
                  />
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: layer.color }}
                  />
                  <span className="text-sm text-slate-700">{layer.name}</span>
                </label>
              ))}
            </div>

            {showHints && currentLevel.hints.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">训练提示：</div>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  {currentLevel.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-semibold text-slate-800 mb-3">异常标注</h3>

            {selectedPoint ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600">选中点</div>
                  <div className="font-medium text-slate-800">
                    #{selectedPoint.originalLineNumber ?? selectedPoint.rowNumber} · {selectedPoint.sourceNote}
                  </div>
                  {(selectedPoint.sourceImage ?? selectedPoint.imageName) && (
                    <div className="text-xs text-slate-500 mt-1">
                      截图: {selectedPoint.sourceImage ?? selectedPoint.imageName}
                    </div>
                  )}
                </div>

                {existingAnnotation ? (
                  <div className="p-3 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: (anomalyTypes.find(t => t.type === existingAnnotation.type)?.color || '#3b82f6') + '20',
                          color: anomalyTypes.find(t => t.type === existingAnnotation.type)?.color || '#3b82f6'
                        }}
                      >
                        {anomalyTypes.find(t => t.type === existingAnnotation.type)?.label}
                      </span>
                      {getStatusBadge(existingAnnotation.status)}
                    </div>
                    {existingAnnotation.comment && (
                      <div className="text-sm text-slate-600">备注: {existingAnnotation.comment}</div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => updateAnnotation(existingAnnotation.id, { status: 'confirmed' })}
                        className="flex-1 px-3 py-1.5 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => updateAnnotation(existingAnnotation.id, { status: 'needs_review' })}
                        className="flex-1 px-3 py-1.5 bg-orange-100 text-orange-800 rounded text-sm hover:bg-orange-200"
                      >
                        需复核
                      </button>
                      <button
                        onClick={() => deleteAnnotation(existingAnnotation.id)}
                        className="flex-1 px-3 py-1.5 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">异常类型</label>
                      <div className="grid grid-cols-2 gap-2">
                        {anomalyTypes.map(({ type, label, color }) => (
                          <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                              selectedType === type
                                ? 'border-2 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            style={{
                              borderColor: selectedType === type ? color : undefined,
                              backgroundColor: selectedType === type ? color + '15' : undefined
                            }}
                          >
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                              style={{ backgroundColor: color }}
                            />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">备注说明</label>
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="输入标注原因..."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleAddAnnotation}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      添加标注
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <p className="text-sm">请在左侧轨迹图中点击一个点</p>
                <p className="text-xs mt-1">当前已标注 {annotations.length} 个异常</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="font-semibold text-slate-800 mb-3">区域复核</h3>
            <div className="space-y-2">
              {currentLevel.correctionZones.map((zone) => (
                <div key={zone.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{zone.label}</span>
                    {getStatusBadge(zone.status)}
                  </div>
                  <div className="text-xs text-slate-500 mb-2">来源: {zone.source}</div>
                  {zone.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleZoneStatusChange(zone.id, 'confirmed')}
                        className="flex-1 px-3 py-1.5 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => handleZoneStatusChange(zone.id, 'rejected')}
                        className="flex-1 px-3 py-1.5 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                      >
                        驳回（撤销）
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {annotations.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">标注列表</h3>
                <span className="text-sm text-slate-500">{annotations.length} 条</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {annotations.map((a) => {
                  const typeInfo = anomalyTypes.find(t => t.type === a.type)
                  return (
                    <div key={a.id} className="p-2 bg-slate-50 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: typeInfo?.color + '20', color: typeInfo?.color }}>
                            {typeInfo?.label}
                          </span>
                          <span className="text-sm text-slate-700">行号 #{a.sourceReference.lineNumber}</span>
                        </div>
                        {getStatusBadge(a.status)}
                      </div>
                      {a.sourceReference.imageName && (
                        <div className="text-xs text-slate-500 mt-1">截图: {a.sourceReference.imageName}</div>
                      )}
                      {a.comment && (
                        <div className="text-xs text-slate-600 mt-1">{a.comment}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnnotationWorkspace
