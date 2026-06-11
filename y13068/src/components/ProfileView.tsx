import React from 'react'
import { useAppStore } from '../store/appStore'
import type { Batten, ViewAngle } from '../types'

const statusColorMap: Record<Batten['status'], string> = {
  normal: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  pending: '#3b82f6',
  suspended: '#a855f7'
}

const statusLabelMap: Record<Batten['status'], string> = {
  normal: '正常',
  warning: '警告',
  error: '异常',
  pending: '待处理',
  suspended: '已挂起'
}

const viewLabels: Record<ViewAngle, string> = {
  front: '正视图',
  side: '侧视图',
  top: '俯视图'
}

interface ViewConfig {
  label: string
  horizontalAxis: 'x' | 'y'
  verticalAxis: 'z' | 'y'
  horizontalRange: [number, number]
  verticalRange: [number, number]
  horizontalLabel: string
  verticalLabel: string
  showHeight: boolean
  showStageFront: boolean
}

const viewConfigs: Record<ViewAngle, ViewConfig> = {
  front: {
    label: '正视图',
    horizontalAxis: 'x',
    verticalAxis: 'z',
    horizontalRange: [0, 16],
    verticalRange: [0, 15],
    horizontalLabel: '舞台宽度 (m)',
    verticalLabel: '高度 (m)',
    showHeight: true,
    showStageFront: true
  },
  side: {
    label: '侧视图',
    horizontalAxis: 'y',
    verticalAxis: 'z',
    horizontalRange: [0, 12],
    verticalRange: [0, 15],
    horizontalLabel: '舞台深度 (m)',
    verticalLabel: '高度 (m)',
    showHeight: true,
    showStageFront: false
  },
  top: {
    label: '俯视图',
    horizontalAxis: 'x',
    verticalAxis: 'y',
    horizontalRange: [0, 16],
    verticalRange: [0, 12],
    horizontalLabel: '舞台宽度 (m)',
    verticalLabel: '舞台深度 (m)',
    showHeight: false,
    showStageFront: false
  }
}

const ProfileView: React.FC = () => {
  const { battens, selectedBattenId, currentView, setCurrentView, selectBatten } = useAppStore()

  const svgWidth = 900
  const svgHeight = 560
  const paddingLeft = 80
  const paddingRight = 60
  const paddingBottom = 80
  const paddingTop = 60

  const config = viewConfigs[currentView]

  const horizontalSpan = config.horizontalRange[1] - config.horizontalRange[0]
  const verticalSpan = config.verticalRange[1] - config.verticalRange[0]

  const hScale = (val: number) =>
    paddingLeft + ((val - config.horizontalRange[0]) / horizontalSpan) * (svgWidth - paddingLeft - paddingRight)

  const vScale = (val: number) =>
    svgHeight - paddingBottom - ((val - config.verticalRange[0]) / verticalSpan) * (svgHeight - paddingTop - paddingBottom)

  const getHCoord = (batten: Batten): number =>
    config.horizontalAxis === 'x' ? batten.currentPosition.x : batten.currentPosition.y

  const getVCoord = (batten: Batten): number =>
    config.verticalAxis === 'z' ? batten.currentPosition.z : batten.currentPosition.y

  const renderGrid = () => {
    const lines = []
    const hStep = horizontalSpan > 12 ? 2 : 2
    const vStep = verticalSpan > 12 ? 2 : 2

    for (let v = config.verticalRange[0]; v <= config.verticalRange[1]; v += vStep) {
      const y = vScale(v)
      lines.push(
        <g key={`vline-${v}`}>
          <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
          <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="11">
            {config.showHeight ? `${v}m` : `${v}m`}
          </text>
        </g>
      )
    }

    for (let h = config.horizontalRange[0]; h <= config.horizontalRange[1]; h += hStep) {
      const x = hScale(h)
      lines.push(
        <g key={`hline-${h}`}>
          <line x1={x} y1={paddingTop} x2={x} y2={svgHeight - paddingBottom} stroke="#e5e7eb" strokeDasharray="4 4" />
          <text x={x} y={svgHeight - paddingBottom + 20} textAnchor="middle" fill="#9ca3af" fontSize="11">
            {h}m
          </text>
        </g>
      )
    }

    lines.push(
      <text key="h-label" x={(svgWidth + paddingLeft - paddingRight) / 2} y={svgHeight - 30} textAnchor="middle" fill="#6b7280" fontSize="12">
        {config.horizontalLabel}
      </text>
    )
    lines.push(
      <text key="v-label" x={20} y={(svgHeight + paddingTop - paddingBottom) / 2} textAnchor="middle" fill="#6b7280" fontSize="12" transform={`rotate(-90, 20, ${(svgHeight + paddingTop - paddingBottom) / 2})`}>
        {config.verticalLabel}
      </text>
    )

    return lines
  }

  const renderStage = () => {
    const floorV = config.verticalRange[0]
    const floorY = vScale(floorV)

    if (config.showStageFront) {
      return (
        <g>
          <line x1={paddingLeft} y1={floorY} x2={svgWidth - paddingRight} y2={floorY} stroke="#6b7280" strokeWidth="2" />
          <text x={paddingLeft - 10} y={floorY + 4} textAnchor="end" fill="#374151" fontSize="12" fontWeight="600">
            舞台面
          </text>
          <rect x={paddingLeft} y={floorY} width={svgWidth - paddingLeft - paddingRight} height={30} fill="#f3f4f6" />
          <text x={(svgWidth + paddingLeft - paddingRight) / 2} y={floorY + 20} textAnchor="middle" fill="#6b7280" fontSize="12">
            观众席 →
          </text>
        </g>
      )
    }

    if (currentView === 'top') {
      return (
        <g>
          <rect x={hScale(0)} y={vScale(0)} width={hScale(16) - hScale(0)} height={vScale(0) - vScale(12)} fill="#f9fafb" stroke="#d1d5db" strokeWidth="1" />
          <text x={hScale(8)} y={vScale(11.5)} textAnchor="middle" fill="#9ca3af" fontSize="11">
            舞台台口
          </text>
          <text x={hScale(8)} y={vScale(0.5)} textAnchor="middle" fill="#9ca3af" fontSize="11">
            ← 观众席方向
          </text>
        </g>
      )
    }

    if (currentView === 'side') {
      return (
        <g>
          <line x1={paddingLeft} y1={floorY} x2={svgWidth - paddingRight} y2={floorY} stroke="#6b7280" strokeWidth="2" />
          <rect x={paddingLeft} y={floorY} width={svgWidth - paddingLeft - paddingRight} height={30} fill="#f3f4f6" />
          <text x={hScale(0.5)} y={floorY - 10} textAnchor="start" fill="#6b7280" fontSize="11">
            台口
          </text>
          <text x={hScale(11)} y={floorY - 10} textAnchor="end" fill="#6b7280" fontSize="11">
            后台
          </text>
        </g>
      )
    }

    return null
  }

  const renderBatten = (batten: Batten) => {
    const isSelected = selectedBattenId === batten.id

    const displayH = getHCoord(batten)
    const displayV = getVCoord(batten)
    let displayTilt = 0
    if (batten.sensorRecords.length > 0 && config.showHeight) {
      displayTilt = batten.sensorRecords[batten.sensorRecords.length - 1].tilt
    }

    const cx = hScale(displayH)
    const cy = vScale(displayV)
    const rectWidth = currentView === 'top' ? 60 : 90
    const rectHeight = currentView === 'top' ? 16 : 16

    const statusColor = statusColorMap[batten.status]

    let className = 'batten-group'
    if (isSelected) className += ' selected'
    if (batten.status === 'error') className += ' abnormal'
    if (batten.isSuspended) className += ' suspended'

    return (
      <g
        key={batten.id}
        className={className}
        onClick={() => selectBatten(batten.id)}
        transform={`rotate(${config.showHeight ? displayTilt * 5 : 0}, ${cx}, ${cy})`}
      >
        {config.showHeight && (
          <line x1={cx} y1={paddingTop} x2={cx} y2={cy - rectHeight / 2} stroke="#9ca3af" strokeWidth="1.5" />
        )}

        <rect
          className="batten-rect"
          x={cx - rectWidth / 2}
          y={cy - rectHeight / 2}
          width={rectWidth}
          height={rectHeight}
          rx={3}
          fill={batten.isSuspended ? '#f3e8ff' : batten.status === 'error' ? '#fecaca' : '#dbeafe'}
          stroke={statusColor}
          strokeWidth={isSelected ? 3 : 1.5}
        />

        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fill="#1f2937" fontWeight="600">
          {batten.label}
        </text>

        <circle cx={cx + rectWidth / 2 + 10} cy={cy} r={6} fill={statusColor} stroke="#fff" strokeWidth="2" />

        {config.showHeight ? (
          <text x={cx} y={cy - rectHeight / 2 - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
            {batten.floorLevel}{batten.floorUnit === 'meters' ? 'm' : batten.floorUnit === 'feet' ? 'ft' : 'mm'}
          </text>
        ) : (
          <text x={cx} y={cy - rectHeight / 2 - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
            {config.verticalAxis === 'y' ? `y=${batten.currentPosition.y}` : `z=${batten.currentPosition.z}`}m
          </text>
        )}

        <text x={cx} y={cy + rectHeight / 2 + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {config.horizontalAxis === 'x' ? `x=${batten.currentPosition.x}` : `y=${batten.currentPosition.y}`}m
        </text>

        {(batten.hasUnitMismatch || batten.status === 'error') && (
          <text x={cx} y={cy + rectHeight / 2 + 28} textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="600">
            ⚠ {batten.hasUnitMismatch ? '单位混写' : ''}{batten.status === 'error' ? '状态异常' : ''}
          </text>
        )}
        {batten.isSuspended && (
          <text x={cx} y={cy + rectHeight / 2 + (batten.hasUnitMismatch || batten.status === 'error' ? 42 : 28)} textAnchor="middle" fontSize="10" fill="#a855f7" fontWeight="600">
            ⏸ 已挂起待确认
          </text>
        )}
      </g>
    )
  }

  const renderLegend = () => (
    <g transform={`translate(${svgWidth - 190}, ${paddingTop})`}>
      <rect x="0" y="0" width="180" height="150" fill="#fff" stroke="#e5e7eb" rx="6" />
      <text x="10" y="20" fontSize="12" fontWeight="600" fill="#374151">图例</text>
      {(['normal', 'warning', 'error', 'suspended'] as const).map((s, i) => (
        <g key={s} transform={`translate(10, ${40 + i * 24})`}>
          <circle cx="6" cy="6" r="6" fill={statusColorMap[s]} />
          <text x="20" y="10" fontSize="11" fill="#374151">{statusLabelMap[s]}</text>
        </g>
      ))}
      <g transform={`translate(10, 132)`}>
        <text fontSize="11" fill="#6b7280">当前: {config.horizontalAxis}-{config.verticalAxis} 平面</text>
      </g>
    </g>
  )

  const renderTitle = () => (
    <g>
      <text x={svgWidth / 2} y={30} textAnchor="middle" fontSize="16" fontWeight="600" fill="#1f2937">
        剧院吊杆阵列剖面图 - {viewLabels[currentView]}
      </text>
      <text x={svgWidth / 2} y={50} textAnchor="middle" fontSize="11" fill="#6b7280">
        投影平面: {config.horizontalAxis.toUpperCase()} - {config.verticalAxis.toUpperCase()} &nbsp;|&nbsp;
        {selectedBattenId
          ? `选中: ${battens.find((b) => b.id === selectedBattenId)?.label ?? ''} 位置(${config.horizontalAxis}=${getHCoord(battens.find((b) => b.id === selectedBattenId)!)}, ${config.verticalAxis}=${getVCoord(battens.find((b) => b.id === selectedBattenId)!)})`
          : '点击吊杆查看详情'}
      </text>
    </g>
  )

  return (
    <div className="section-profile">
      <div className="view-tabs">
        {(['front', 'side', 'top'] as ViewAngle[]).map((v) => (
          <div
            key={v}
            className={`view-tab ${currentView === v ? 'active' : ''}`}
            onClick={() => setCurrentView(v)}
          >
            {viewLabels[v]}
            <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.8 }}>
              {viewConfigs[v].horizontalAxis}-{viewConfigs[v].verticalAxis}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
          切换视角时投影平面变化，但场景标注、侧边说明、截图说明保持一致
        </div>
      </div>
      <div className="svg-container">
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block', margin: '0 auto' }}>
          {renderTitle()}
          {renderGrid()}
          {renderStage()}
          {battens.map(renderBatten)}
          {renderLegend()}
        </svg>
      </div>
    </div>
  )
}

export default ProfileView
