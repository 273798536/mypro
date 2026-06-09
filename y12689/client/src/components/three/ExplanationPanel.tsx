import { AlertTriangle, Info, RotateCw, ZoomIn, Move, Eye } from 'lucide-react'
import type { NormalRecord } from '@/types'

interface ExplanationPanelProps {
  record: NormalRecord
}

const colorLegend = [
  {
    color: '#ff4d4f',
    label: '红色点',
    description: '法线方向朝向X轴正方向，偏差较大区域',
  },
  {
    color: '#00e5ff',
    label: '青色点',
    description: '法线方向朝向Y轴正方向',
  },
  {
    color: '#1890ff',
    label: '蓝色点',
    description: '法线方向朝向Z轴正方向',
  },
  {
    color: '#52c41a',
    label: '绿色点',
    description: '法线方向正确，在允许偏差范围内',
  },
]

const interactionGuide = [
  {
    icon: RotateCw,
    text: '鼠标左键拖拽：旋转视角',
  },
  {
    icon: ZoomIn,
    text: '鼠标滚轮：缩放视图',
  },
  {
    icon: Move,
    text: '鼠标右键拖拽：平移视图',
  },
  {
    icon: Eye,
    text: '调整剖切轴和位置：观察内部结构',
  },
]

function ExplanationPanel({ record }: ExplanationPanelProps) {
  const hasOcclusion = record.occlusion?.detected

  return (
    <div
      className={`bg-bg-card border rounded-lg p-4 ${
        hasOcclusion ? 'border-danger/60' : 'border-success/60'
      }`}
    >
      <h3 className="text-text-primary text-sm font-medium mb-4 flex items-center gap-2">
        <Info size={16} className="text-primary" />
        视图说明
      </h3>

      {hasOcclusion && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-danger text-sm font-medium mb-1">检测到透明遮挡</div>
              <div className="text-text-secondary text-xs">
                {record.occlusion.reason || '存在可能影响测量准确性的遮挡物'}
              </div>
              {record.occlusion.severity && (
                <div className="text-warning text-xs mt-1">
                  严重程度：{record.occlusion.severity === 'high' ? '高' : record.occlusion.severity === 'medium' ? '中' : '低'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="text-text-secondary text-xs font-medium mb-2">颜色编码说明</div>
        <div className="space-y-2">
          {colorLegend.map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <div
                className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <div className="text-text-primary text-xs font-medium">{item.label}</div>
                <div className="text-text-muted text-xs">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-text-secondary text-xs font-medium mb-2">交互操作</div>
        <div className="space-y-2">
          {interactionGuide.map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon size={12} className="text-text-muted flex-shrink-0" />
              <span className="text-text-muted text-xs">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ExplanationPanel
