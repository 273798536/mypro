import { Plus, Settings } from 'lucide-react'
import type { WindowConfig, ServiceWindow } from '@/types'

interface Props {
  windowConfig: WindowConfig
  windows: ServiceWindow[]
  onAddWindow: () => void
}

export default function WindowConfigPanel({ windowConfig, windows, onAddWindow }: Props) {
  const activeCount = windows.filter(w => w.status !== 'disabled').length
  const disabledCount = windows.filter(w => w.status === 'disabled').length

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Settings size={16} className="text-milk-400" />
        <h3 className="font-bold text-milk-700 text-sm">窗口配置</h3>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-milk-500">总窗口数</span>
          <span className="font-bold text-milk-700">{windowConfig.windowCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-milk-500">活跃窗口</span>
          <span className="font-bold text-window-idle">{activeCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-milk-500">停用窗口</span>
          <span className="font-bold text-window-disabled">{disabledCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-milk-500">服务率 μ</span>
          <span className="font-bold text-milk-700">{windowConfig.serviceRate}</span>
        </div>

        <div className="pt-2 border-t border-milk-100">
          <div className="text-milk-400 mb-2">停用窗口列表</div>
          {windowConfig.disabledWindows.length === 0 ? (
            <div className="text-milk-300 italic">无</div>
          ) : (
            windowConfig.disabledWindows.map(wid => (
              <div key={wid} className="text-window-disabled">
                窗口{wid + 1}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onAddWindow}
        className="btn-secondary w-full mt-3 flex items-center justify-center gap-1 text-xs"
      >
        <Plus size={14} /> 新增窗口
      </button>
    </div>
  )
}
