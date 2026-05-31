import type { ServiceWindow, CustomerCard } from '@/types'
import { Coffee, Wrench, CheckCircle } from 'lucide-react'

interface Props {
  window: ServiceWindow
  customers: CustomerCard[]
  onEnable: (id: number) => void
}

export default function WindowPanelItem({ window, customers, onEnable }: Props) {
  const currentCustomer = window.currentCustomer
    ? customers.find(c => c.id === window.currentCustomer)
    : null

  const statusBg = {
    idle: 'bg-window-idle/10 border-window-idle/40',
    serving: 'bg-window-serving/10 border-window-serving/40',
    disabled: 'bg-window-disabled/10 border-window-disabled/40',
  }[window.status]

  const statusIcon = {
    idle: <CheckCircle size={16} className="text-window-idle" />,
    serving: <Coffee size={16} className="text-window-serving" />,
    disabled: <Wrench size={16} className="text-window-disabled" />,
  }[window.status]

  const statusLabel = {
    idle: '空闲',
    serving: '服务中',
    disabled: '停用',
  }[window.status]

  return (
    <div className={`card border-2 ${statusBg} min-h-[120px]`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="font-bold text-milk-700 text-sm">{window.label}</span>
        </div>
        <span className="text-xs font-medium text-milk-500">{statusLabel}</span>
      </div>

      {window.status === 'serving' && currentCustomer && (
        <div className="space-y-1">
          <div className="text-xs text-milk-600">
            🧋 {currentCustomer.appointmentNo}
          </div>
          <div className="w-full bg-milk-200 rounded-full h-2">
            <div
              className="bg-window-serving h-2 rounded-full progress-bar"
              style={{ width: `${window.serviceProgress * 100}%` }}
            />
          </div>
          <div className="text-xs text-milk-400 text-right">
            {Math.round(window.serviceProgress * 100)}%
          </div>
        </div>
      )}

      {window.status === 'idle' && (
        <div className="text-xs text-milk-400 italic">等待顾客...</div>
      )}

      {window.status === 'disabled' && (
        <div className="space-y-2">
          <div className="text-xs text-red-500">
            {window.disabledReason ?? '已停用'} (T{window.disabledAt})
          </div>
          <button
            onClick={() => onEnable(window.id)}
            className="text-xs bg-window-idle/20 text-green-700 px-3 py-1 rounded-full
                       hover:bg-window-idle/40 transition-all duration-200"
          >
            恢复启用
          </button>
        </div>
      )}
    </div>
  )
}
