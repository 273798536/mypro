import { useGameStore } from '../../store/useGameStore'
import { DISHES } from '../../data/dishes'
import type { PrepSlot as PrepSlotType } from '../../types/game'

function PrepSlotComponent({ slot }: { slot: PrepSlotType }) {
  const orders = useGameStore(s => s.orders)
  const selectedOrderId = useGameStore(s => s.selectedOrderId)
  const assignToPrep = useGameStore(s => s.assignToPrep)
  const pickupFromPrep = useGameStore(s => s.pickupFromPrep)

  const order = slot.orderId ? orders.find(o => o.id === slot.orderId) : null
  const dishNames = order ? order.dishIds.map(id => DISHES.find(d => d.id === id)).filter(Boolean) : []
  const isAvailable = !slot.orderId
  const isReady = order?.status === 'ready'

  const handleClick = () => {
    if (isAvailable && selectedOrderId) {
      assignToPrep(slot.id)
    } else if (isReady && order) {
      pickupFromPrep(slot.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={isAvailable && selectedOrderId ? 0 : isReady ? 0 : -1}
      aria-label={isAvailable && selectedOrderId ? '放入备餐' : isReady ? '取餐' : isAvailable ? '空备餐位' : '备餐中'}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      className={`
        relative rounded-xl border-2 p-3 transition-all duration-200 min-h-[100px] flex flex-col justify-center items-center
        ${isAvailable && selectedOrderId
          ? 'border-primary bg-primary/5 cursor-pointer hover:bg-primary/10 hover:scale-105 hover:shadow-lg'
          : isAvailable
          ? 'border-dashed border-gray-300 bg-gray-50 cursor-default'
          : isReady
          ? 'border-green-400 bg-green-50 cursor-pointer hover:bg-green-100 hover:scale-105 shadow-md'
          : 'border-yellow-400 bg-yellow-50'
        }
      `}
    >
      {isAvailable && selectedOrderId && (
        <div className="text-center">
          <div className="text-2xl mb-1">📥</div>
          <div className="text-xs text-primary font-bold">放入备餐</div>
        </div>
      )}

      {isAvailable && !selectedOrderId && (
        <div className="text-center text-gray-300">
          <div className="text-2xl mb-1">🍽️</div>
          <div className="text-xs">空备餐位</div>
        </div>
      )}

      {order && !isAvailable && (
        <div className="w-full">
          <div className="flex items-center gap-1 mb-1">
            {dishNames.map(d => (
              <span key={d!.id} className="text-lg">{d!.emoji}</span>
            ))}
            <span className="text-xs text-gray-600 truncate flex-1">
              {dishNames.map(d => d!.name).join('+')}
            </span>
          </div>

          {!isReady && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-100"
                style={{ width: `${slot.progress}%` }}
              />
            </div>
          )}

          {isReady && (
            <div className="mt-2 text-center">
              <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-lg">
                ✅ 可取餐！点击取走
              </span>
            </div>
          )}
        </div>
      )}

      <div className="absolute top-1 right-1 text-[10px] text-gray-400">
        {slot.id.split('-')[1] ? `#${parseInt(slot.id.split('-')[1]) + 1}` : ''}
      </div>
    </div>
  )
}

export default function PrepStation() {
  const prepSlots = useGameStore(s => s.prepSlots)
  const selectedOrderId = useGameStore(s => s.selectedOrderId)

  return (
    <div className="bg-cafeteria-card rounded-xl shadow-lg border border-cafeteria-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-lg text-primary">🍳 备餐台</h3>
        {selectedOrderId && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full animate-pulse">
            点击备餐位放入
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {prepSlots.map(slot => (
          <PrepSlotComponent key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  )
}
