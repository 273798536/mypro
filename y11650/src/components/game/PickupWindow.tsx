import { useGameStore } from '../../store/useGameStore'
import { GRADE_COLORS } from '../../types/game'
import type { PickupWindow as PickupWindowType } from '../../types/game'

function WindowComponent({ window: win }: { window: PickupWindowType }) {
  const deliverToWindow = useGameStore(s => s.deliverToWindow)
  const selectedOrderId = useGameStore(s => s.selectedOrderId)
  const orders = useGameStore(s => s.orders)
  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null

  const isCongested = win.queue.length >= win.maxQueue
  const gradeColor = GRADE_COLORS[win.grade]
  const canDeliver = selectedOrder && (selectedOrder.status === 'ready')

  const handleClick = () => {
    if (canDeliver) {
      deliverToWindow(win.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={canDeliver ? 0 : -1}
      aria-label={`${win.name} 排队${win.queue.length}/${win.maxQueue} ${isCongested ? '拥堵' : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      className={`
        relative rounded-xl border-2 p-3 transition-all duration-200 min-w-[140px]
        ${isCongested ? 'animate-flash-yellow border-warning' : 'border-cafeteria-border'}
        ${canDeliver ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
        bg-cafeteria-card
      `}
    >
      <div className="flex items-center gap-1 mb-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: gradeColor }}
        />
        <span className="font-display text-sm" style={{ color: gradeColor }}>
          {win.name}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-1">
        <span className="text-lg">🏪</span>
        <span className={`text-lg font-bold ${isCongested ? 'text-warning' : 'text-gray-700'}`}>
          {win.queue.length}
        </span>
        <span className="text-xs text-gray-400">/ {win.maxQueue}</span>
      </div>

      {isCongested && (
        <div className="text-[10px] text-warning font-bold">⚠️ 拥堵!</div>
      )}

      {canDeliver && (
        <div className="absolute inset-0 rounded-xl border-2 border-primary/50 bg-primary/5 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-primary font-bold bg-white/80 px-2 py-1 rounded">
            点击送餐
          </span>
        </div>
      )}

      <div className="flex -space-x-1 mt-1">
        {win.queue.slice(0, 4).map((orderId, i) => (
          <div
            key={orderId}
            className="w-4 h-4 rounded-full border border-white text-[8px] flex items-center justify-center text-white"
            style={{ backgroundColor: gradeColor, zIndex: 4 - i }}
          >
            {i + 1}
          </div>
        ))}
        {win.queue.length > 4 && (
          <span className="text-[8px] text-gray-400 ml-2">+{win.queue.length - 4}</span>
        )}
      </div>
    </div>
  )
}

export default function PickupWindow() {
  const windows = useGameStore(s => s.windows)
  const selectedOrderId = useGameStore(s => s.selectedOrderId)
  const orders = useGameStore(s => s.orders)
  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null

  return (
    <div className="bg-cafeteria-card rounded-xl shadow-lg border border-cafeteria-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg text-primary">🏪 取餐窗口</h3>
        {selectedOrder?.status === 'ready' && (
          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full animate-pulse">
            点击窗口送餐
          </span>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {windows.map(win => (
          <WindowComponent key={win.id} window={win} />
        ))}
      </div>
    </div>
  )
}
