import { useGameStore } from '../../store/useGameStore'
import { DISHES } from '../../data/dishes'
import { GRADE_COLORS, ALLERGEN_ICONS } from '../../types/game'
import type { Order } from '../../types/game'

function OrderCardComponent({ order, isSelected, onClick }: { order: Order; isSelected: boolean; onClick: () => void }) {
  const dishNames = order.dishIds.map(id => DISHES.find(d => d.id === id)).filter(Boolean)
  const gradeColor = GRADE_COLORS[order.grade]
  const hasAllergen = order.allergens.length > 0

  const statusBg = order.status === 'pending'
    ? 'bg-white'
    : order.status === 'preparing'
    ? 'bg-yellow-50 border-yellow-300'
    : order.status === 'ready'
    ? 'bg-green-50 border-green-300'
    : order.status === 'delivered'
    ? 'bg-gray-100 border-gray-300 opacity-50'
    : 'bg-red-50 border-red-300 opacity-50'

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${order.grade}订单 ${dishNames.map(d => d!.name).join('+')} ${hasAllergen ? '含过敏原' + order.allergens.join(',') : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={`
        relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${statusBg}
        ${isSelected ? 'ring-2 ring-primary shadow-lg scale-105' : 'hover:shadow-md'}
        ${hasAllergen && order.status === 'pending' ? 'animate-pulse-red' : ''}
        ${order.status === 'delivered' || order.status === 'failed' ? 'pointer-events-none' : ''}
      `}
    >
      <div className="flex items-center gap-1 mb-1">
        <span
          className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: gradeColor }}
        >
          {order.grade}
        </span>
        {order.status === 'pending' && (
          <span className="text-[10px] text-gray-400 ml-auto">
            #{order.id.slice(-3)}
          </span>
        )}
      </div>

      <div className="flex gap-0.5 mb-1">
        {dishNames.map(dish => (
          <span key={dish!.id} className="text-lg" title={dish!.name}>
            {dish!.emoji}
          </span>
        ))}
        <span className="text-xs text-gray-500 self-end ml-1">
          {dishNames.map(d => d!.name).join('+')}
        </span>
      </div>

      {hasAllergen && (
        <div className="flex gap-0.5 items-center mt-1">
          <span className="text-xs text-red-600 font-bold">⚠️过敏原:</span>
          {order.allergens.map(a => (
            <span key={a} className="text-xs bg-red-100 text-red-700 px-1 rounded flex items-center gap-0.5">
              {ALLERGEN_ICONS[a]} {a}
            </span>
          ))}
        </div>
      )}

      {order.status === 'preparing' && (
        <div className="mt-1 text-xs text-yellow-600 font-medium">备餐中...</div>
      )}
      {order.status === 'ready' && (
        <div className="mt-1 text-xs text-green-600 font-bold">✅ 可取餐</div>
      )}
      {order.status === 'failed' && (
        <div className="mt-1 text-xs text-red-600 font-bold">❌ 已超时</div>
      )}

      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </div>
      )}
    </div>
  )
}

export default function OrderQueue() {
  const orders = useGameStore(s => s.orders)
  const selectedOrderId = useGameStore(s => s.selectedOrderId)
  const selectOrder = useGameStore(s => s.selectOrder)

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const otherOrders = orders.filter(o => o.status !== 'pending' && o.status !== 'delivered' && o.status !== 'failed')

  return (
    <div className="bg-cafeteria-card rounded-xl shadow-lg border border-cafeteria-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg text-primary">📋 订单队列</h3>
        <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
          {pendingOrders.length} 待处理
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {pendingOrders.length === 0 && otherOrders.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4 w-full">
            等待订单...
          </div>
        )}

        {pendingOrders.map(order => (
          <div key={order.id} className="animate-slide-in-left shrink-0 w-36">
            <OrderCardComponent
              order={order}
              isSelected={selectedOrderId === order.id}
              onClick={() => selectOrder(order.id)}
            />
          </div>
        ))}

        {otherOrders.length > 0 && (
          <>
            <div className="shrink-0 border-l-2 border-gray-200 mx-1" />
            {otherOrders.map(order => (
              <div key={order.id} className="shrink-0 w-36">
                <OrderCardComponent
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  onClick={() => {
                    if (order.status === 'ready') {
                      selectOrder(order.id)
                    }
                  }}
                />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-cafeteria-border text-[10px] text-gray-400">
        点击订单选择 → 点击备餐台开始备餐 → 备餐完成取餐 → 点击窗口送出
      </div>
    </div>
  )
}
