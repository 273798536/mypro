import { Square } from 'lucide-react'

const Legend = () => {
  const items = [
    { color: '#06b6d4', label: '气流路径（正常）', desc: '青色系表示气流温度在22-25℃正常范围，流速稳定' },
    { color: '#f59e0b', label: '气流路径（警告）', desc: '橙色系表示气流温度偏高（25-29℃），需关注流速变化' },
    { color: '#ef4444', label: '气流路径（异常）', desc: '红色系表示气流温度过高（>30℃），存在明显越界风险' },
    { color: '#10b981', label: '剖切面（正常）', desc: '绿色实线表示剖切面在安全范围内，无越界问题' },
    { color: '#f59e0b', label: '剖切面（警告）', desc: '橙色虚线表示剖切面接近越界阈值，建议人工复核' },
    { color: '#ef4444', label: '剖切面（越界）', desc: '红色闪烁实线表示剖切面已越界，需要立即整改' },
    { color: '#64748b', label: '服务器机柜', desc: '灰色方块表示发热设备，是气流冷却的主要目标' },
    { color: '#0ea5e9', label: '空调设备', desc: '蓝色方块表示制冷设备，是冷气流的来源' },
    { color: 'rgba(239, 68, 68, 0.1)', label: '安全边界外', desc: '红色区域为机房安全边界以外，气流不可进入' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        图例与明细说明
      </h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-5 h-5 rounded border border-slate-300 mt-0.5"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800">{item.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-cyan-50 border border-cyan-100">
        <p className="text-xs text-cyan-700 leading-relaxed">
          <strong>提示：</strong>颜色仅为辅助标识，所有判断均以右侧面板中的文字说明和数值数据为准。
          鼠标悬停在画布元素上可查看详细信息。
        </p>
      </div>
    </div>
  )
}

export default Legend
