import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { STRATUM_COLORS, generateId, UNIT_LABELS } from '../types'
import type { Layer, Boundary, Unit } from '../types'

const PIXELS_PER_UNIT = 20
const CANVAS_WIDTH = 500

export default function EditorPage() {
  const navigate = useNavigate()
  const { state, dispatch, canUndo, canRedo, undo, redo, executeWithUndoable } = useApp()
  const { currentProfile, operationHistory, selectedLayerId, selectedBoundaryId } = state
  const [activeTab, setActiveTab] = useState<'layers' | 'boundaries' | 'history'>('layers')

  const pendingAnomalies = currentProfile?.anomalies.filter(a => a.status === 'pending') || []

  const handleAddLayer = () => {
    if (!currentProfile) return
    const idx = currentProfile.layers.length
    const lastBottom = currentProfile.layers.length > 0
      ? Math.max(...currentProfile.layers.map(l => l.depth.bottom))
      : 0
    const newLayer: Layer = {
      id: generateId('layer'),
      name: `岩层${idx + 1}`,
      color: STRATUM_COLORS[idx % STRATUM_COLORS.length],
      depth: { top: lastBottom, bottom: lastBottom + 5 },
      thickness: 5,
      unit: 'meter',
      annotations: [],
      remarks: ''
    }
    executeWithUndoable(
      () => { dispatch({ type: 'ADD_LAYER', payload: newLayer }); return newLayer },
      () => { dispatch({ type: 'DELETE_LAYER', payload: newLayer.id }) },
      'add_layer',
      `新增岩层：${newLayer.name}`
    )
  }

  const handleDeleteLayer = (id: string) => {
    const layer = currentProfile?.layers.find(l => l.id === id)
    if (!layer) return
    const prevLayers = currentProfile?.layers || []
    const prevBoundaries = currentProfile?.boundaries || []
    executeWithUndoable(
      () => { dispatch({ type: 'DELETE_LAYER', payload: id }); return { layer, id } },
      () => {
        dispatch({ type: 'ADD_LAYER', payload: layer })
        prevBoundaries.filter(b => b.relatedLayerId === id).forEach(b => {
          dispatch({ type: 'ADD_BOUNDARY', payload: b })
        })
      },
      'delete_layer',
      `删除岩层：${layer.name}`
    )
  }

  const handleUpdateLayer = (updated: Layer) => {
    const prev = currentProfile?.layers.find(l => l.id === updated.id)
    if (!prev) return
    const thickness = Math.abs(updated.depth.bottom - updated.depth.top)
    const withThickness = { ...updated, thickness }
    executeWithUndoable(
      () => { dispatch({ type: 'UPDATE_LAYER', payload: withThickness }); return withThickness },
      () => { dispatch({ type: 'UPDATE_LAYER', payload: prev }) },
      'update_layer',
      `更新岩层：${withThickness.name}`
    )
  }

  const handleAddBoundary = () => {
    if (!currentProfile) return
    const idx = currentProfile.boundaries.length
    const newBoundary: Boundary = {
      id: generateId('bnd'),
      type: 'layer',
      startPoint: { x: 0, y: 50 + idx * 80 },
      endPoint: { x: 500, y: 50 + idx * 80 },
      status: 'normal',
      color: '#636E72'
    }
    executeWithUndoable(
      () => { dispatch({ type: 'ADD_BOUNDARY', payload: newBoundary }); return newBoundary },
      () => { dispatch({ type: 'DELETE_BOUNDARY', payload: newBoundary.id }) },
      'add_boundary',
      `新增边界线`
    )
  }

  const handleDeleteBoundary = (id: string) => {
    const boundary = currentProfile?.boundaries.find(b => b.id === id)
    if (!boundary) return
    executeWithUndoable(
      () => { dispatch({ type: 'DELETE_BOUNDARY', payload: id }); return { boundary, id } },
      () => { dispatch({ type: 'ADD_BOUNDARY', payload: boundary }) },
      'delete_boundary',
      `删除边界线`
    )
  }

  const handleUpdateBoundary = (updated: Boundary) => {
    const prev = currentProfile?.boundaries.find(b => b.id === updated.id)
    if (!prev) return
    executeWithUndoable(
      () => { dispatch({ type: 'UPDATE_BOUNDARY', payload: updated }); return updated },
      () => { dispatch({ type: 'UPDATE_BOUNDARY', payload: prev }) },
      'update_boundary',
      `更新边界线`
    )
  }

  const handleLayerClick = (id: string) => {
    dispatch({ type: 'SET_SELECTED_LAYER', payload: id })
    dispatch({ type: 'SET_SELECTED_BOUNDARY', payload: null })
  }

  const handleBoundaryClick = (id: string) => {
    dispatch({ type: 'SET_SELECTED_BOUNDARY', payload: id })
    dispatch({ type: 'SET_SELECTED_LAYER', payload: null })
  }

  const renderSvg = () => {
    if (!currentProfile) {
      return (
        <div className="flex items-center justify-center h-full text-stratum-mid">
          暂无剖面数据，请从启动页加载或创建
        </div>
      )
    }

    const maxDepth = Math.max(
      ...currentProfile.layers.map(l => l.depth.bottom),
      ...currentProfile.boundaries.map(b => Math.max(b.startPoint.y, b.endPoint.y))
    )
    const canvasHeight = Math.max(maxDepth * PIXELS_PER_UNIT + 100, 400)

    return (
      <svg
        width="100%"
        viewBox={`0 0 ${CANVAS_WIDTH} ${canvasHeight}`}
        className="bg-white"
      >
        {currentProfile.layers.map(layer => {
          const y = layer.depth.top * PIXELS_PER_UNIT
          const h = layer.thickness * PIXELS_PER_UNIT
          const isSelected = selectedLayerId === layer.id
          return (
            <g key={layer.id} onClick={() => handleLayerClick(layer.id)} className="cursor-pointer">
              <rect
                x={0}
                y={y}
                width={CANVAS_WIDTH}
                height={Math.max(h, 1)}
                fill={layer.color}
                stroke={isSelected ? '#E17055' : 'rgba(0,0,0,0.1)'}
                strokeWidth={isSelected ? 3 : 1}
              />
              <text
                x={20}
                y={y + h / 2 + 5}
                fill="#2D3436"
                fontSize={14}
                fontWeight="bold"
                pointerEvents="none"
              >
                {layer.name}
              </text>
              <text
                x={20}
                y={y + h / 2 + 22}
                fill="#636E72"
                fontSize={12}
                pointerEvents="none"
              >
                {layer.depth.top} ~ {layer.depth.bottom} {UNIT_LABELS[layer.unit]}
              </text>
            </g>
          )
        })}

        {currentProfile.boundaries.map(boundary => {
          const isSelected = selectedBoundaryId === boundary.id
          return (
            <line
              key={boundary.id}
              x1={boundary.startPoint.x}
              y1={boundary.startPoint.y}
              x2={boundary.endPoint.x}
              y2={boundary.endPoint.y}
              stroke={boundary.color || '#636E72'}
              strokeWidth={isSelected ? 4 : 2}
              strokeDasharray={boundary.type === 'fault' ? '8,4' : undefined}
              className="cursor-pointer"
              onClick={() => handleBoundaryClick(boundary.id)}
            />
          )
        })}

        {currentProfile.anomalies.filter(a => a.status === 'pending').map(anomaly => {
          const cx = anomaly.location.coordinates.x
          const cy = anomaly.location.coordinates.y
          return (
            <g key={anomaly.id}>
              <circle cx={cx} cy={cy} r={14} fill="#E17055" opacity={0.9} />
              <text
                x={cx}
                y={cy + 5}
                fill="white"
                fontSize={14}
                fontWeight="bold"
                textAnchor="middle"
                pointerEvents="none"
              >
                !
              </text>
            </g>
          )
        })}

        {currentProfile.layers.flatMap(layer =>
          layer.annotations.map(ann => (
            <text
              key={ann.id}
              x={ann.position.x}
              y={ann.position.y}
              fill="#2D3436"
              fontSize={11}
              pointerEvents="none"
            >
              {ann.content}
            </text>
          ))
        )}
      </svg>
    )
  }

  const selectedLayer = currentProfile?.layers.find(l => l.id === selectedLayerId)
  const selectedBoundary = currentProfile?.boundaries.find(b => b.id === selectedBoundaryId)

  const formatTime = (d: Date) => {
    const date = d instanceof Date ? d : new Date(d)
    return date.toLocaleString('zh-CN', { hour12: false })
  }

  return (
    <div className="h-screen flex flex-col bg-stratum-bg">
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-stratum-dark">
            {currentProfile?.name || '岩层剖面编辑器'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/anomalies')}
          className="flex items-center gap-2 px-4 py-2 bg-stratum-alert text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          <span>⚠️</span>
          <span>查看异常</span>
          {pendingAnomalies.length > 0 && (
            <span className="bg-white text-stratum-alert text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingAnomalies.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-60 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-stratum-dark mb-3">工具栏</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={handleAddLayer}
                className="flex flex-col items-center gap-1 p-3 bg-orange-50 text-stratum-dark rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <span className="text-lg">📑</span>
                <span className="text-xs">添加岩层</span>
              </button>
              <button
                onClick={handleAddBoundary}
                className="flex flex-col items-center gap-1 p-3 bg-blue-50 text-stratum-dark rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <span className="text-lg">📏</span>
                <span className="text-xs">添加边界</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={undo}
                disabled={!canUndo()}
                className="flex items-center justify-center gap-1 p-2 bg-gray-50 text-stratum-dark rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>↶</span>
                <span className="text-xs">撤销</span>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo()}
                className="flex items-center justify-center gap-1 p-2 bg-gray-50 text-stratum-dark rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>↷</span>
                <span className="text-xs">重做</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-gray-100 flex">
              <button
                onClick={() => setActiveTab('layers')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'layers'
                    ? 'text-stratum-dark border-b-2 border-stratum-alert'
                    : 'text-stratum-mid hover:text-stratum-dark'
                }`}
              >
                岩层 ({currentProfile?.layers.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('boundaries')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'boundaries'
                    ? 'text-stratum-dark border-b-2 border-stratum-alert'
                    : 'text-stratum-mid hover:text-stratum-dark'
                }`}
              >
                边界 ({currentProfile?.boundaries.length || 0})
              </button>
            </div>

            <div className="p-3 space-y-2">
              {activeTab === 'layers' && currentProfile?.layers.map(layer => (
                <div
                  key={layer.id}
                  onClick={() => handleLayerClick(layer.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedLayerId === layer.id
                      ? 'border-stratum-alert bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm font-medium text-stratum-dark">{layer.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id) }}
                      className="text-gray-400 hover:text-stratum-alert text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-stratum-mid space-y-0.5">
                    <div>深度: {layer.depth.top} ~ {layer.depth.bottom}</div>
                    <div>厚度: {layer.thickness} {UNIT_LABELS[layer.unit]}</div>
                  </div>
                </div>
              ))}

              {activeTab === 'boundaries' && currentProfile?.boundaries.map((boundary, idx) => (
                <div
                  key={boundary.id}
                  onClick={() => handleBoundaryClick(boundary.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedBoundaryId === boundary.id
                      ? 'border-stratum-alert bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-1 rounded"
                        style={{ backgroundColor: boundary.color || '#636E72' }}
                      />
                      <span className="text-sm font-medium text-stratum-dark">
                        边界{idx + 1} ({boundary.type})
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBoundary(boundary.id) }}
                      className="text-gray-400 hover:text-stratum-alert text-sm"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-stratum-mid">
                    ({boundary.startPoint.x},{boundary.startPoint.y}) → ({boundary.endPoint.x},{boundary.endPoint.y})
                  </div>
                </div>
              ))}

              {activeTab === 'layers' && currentProfile?.layers.length === 0 && (
                <div className="text-center text-sm text-stratum-mid py-8">
                  暂无岩层，点击上方「添加岩层」按钮创建
                </div>
              )}
              {activeTab === 'boundaries' && currentProfile?.boundaries.length === 0 && (
                <div className="text-center text-sm text-stratum-mid py-8">
                  暂无边界线，点击上方「添加边界」按钮创建
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-h-full">
            {renderSvg()}
          </div>
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-stratum-dark">属性面板</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedLayer && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">岩层名称</label>
                  <input
                    type="text"
                    value={selectedLayer.name}
                    onChange={(e) => handleUpdateLayer({ ...selectedLayer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">颜色</label>
                  <div className="flex flex-wrap gap-2">
                    {STRATUM_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => handleUpdateLayer({ ...selectedLayer, color })}
                        className={`w-7 h-7 rounded border-2 transition-all ${
                          selectedLayer.color === color ? 'border-stratum-alert scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">顶部深度</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedLayer.depth.top}
                      onChange={(e) => handleUpdateLayer({
                        ...selectedLayer,
                        depth: { ...selectedLayer.depth, top: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">底部深度</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedLayer.depth.bottom}
                      onChange={(e) => handleUpdateLayer({
                        ...selectedLayer,
                        depth: { ...selectedLayer.depth, bottom: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">单位</label>
                  <select
                    value={selectedLayer.unit}
                    onChange={(e) => handleUpdateLayer({ ...selectedLayer, unit: e.target.value as Unit })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert bg-white"
                  >
                    {Object.entries(UNIT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">备注</label>
                  <textarea
                    value={selectedLayer.remarks}
                    onChange={(e) => handleUpdateLayer({ ...selectedLayer, remarks: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert resize-none"
                  />
                </div>
              </div>
            )}

            {selectedBoundary && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">类型</label>
                  <select
                    value={selectedBoundary.type}
                    onChange={(e) => handleUpdateBoundary({
                      ...selectedBoundary,
                      type: e.target.value as Boundary['type']
                    })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert bg-white"
                  >
                    <option value="layer">岩层边界</option>
                    <option value="fault">断层</option>
                    <option value="contact">接触面</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">起点 X</label>
                    <input
                      type="number"
                      value={selectedBoundary.startPoint.x}
                      onChange={(e) => handleUpdateBoundary({
                        ...selectedBoundary,
                        startPoint: { ...selectedBoundary.startPoint, x: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">起点 Y</label>
                    <input
                      type="number"
                      value={selectedBoundary.startPoint.y}
                      onChange={(e) => handleUpdateBoundary({
                        ...selectedBoundary,
                        startPoint: { ...selectedBoundary.startPoint, y: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">终点 X</label>
                    <input
                      type="number"
                      value={selectedBoundary.endPoint.x}
                      onChange={(e) => handleUpdateBoundary({
                        ...selectedBoundary,
                        endPoint: { ...selectedBoundary.endPoint, x: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stratum-mid mb-1">终点 Y</label>
                    <input
                      type="number"
                      value={selectedBoundary.endPoint.y}
                      onChange={(e) => handleUpdateBoundary({
                        ...selectedBoundary,
                        endPoint: { ...selectedBoundary.endPoint, y: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-stratum-alert"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stratum-mid mb-1">颜色</label>
                  <input
                    type="color"
                    value={selectedBoundary.color || '#636E72'}
                    onChange={(e) => handleUpdateBoundary({ ...selectedBoundary, color: e.target.value })}
                    className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {!selectedLayer && !selectedBoundary && (
              <div className="text-center text-sm text-stratum-mid py-8">
                请在画布或左侧列表中选择岩层或边界线
              </div>
            )}
          </div>

          <div className="border-t border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-stratum-dark">操作历史</h2>
              <span className="text-xs text-stratum-mid">{operationHistory.length} 条</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {operationHistory.length === 0 ? (
                <div className="text-center text-sm text-stratum-mid py-6">暂无操作记录</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {[...operationHistory].reverse().map(record => (
                    <div key={record.id} className="px-4 py-2">
                      <div className="text-sm text-stratum-dark">{record.description}</div>
                      <div className="text-xs text-stratum-mid mt-0.5">{formatTime(record.timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
