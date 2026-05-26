import { Package, Clock, AlertCircle } from 'lucide-react';
import type { Order, Shelf } from '../../types';
import { formatTime, getPriorityLabel, getPriorityBgColor } from '../../utils/scoring';
import { useGameStore } from '../../store/gameStore';

interface OrderPanelProps {
  orders: Order[];
  shelves: Shelf[];
  selectedRobotId: string | null;
}

export function OrderPanel({ orders, shelves, selectedRobotId }: OrderPanelProps) {
  const assignOrderToRobot = useGameStore(state => state.assignOrderToRobot);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const assignedOrders = orders.filter(o => o.status === 'assigned');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const timeoutOrders = orders.filter(o => o.status === 'timeout');

  const getShelfName = (shelfId: string) => {
    return shelves.find(s => s.id === shelfId)?.name || shelfId;
  };

  const renderOrder = (order: Order) => {
    const shelfName = getShelfName(order.shelfId);
    const timePercent = (order.remainingTime / order.timeLimit) * 100;
    const isUrgent = timePercent < 30;

    return (
      <div
        key={order.id}
        className={`p-3 rounded-lg bg-slate-700 border-l-4 ${
          isUrgent ? 'border-red-500 animate-pulse' : getPriorityBgColor(order.priority)
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-white font-semibold text-sm">{order.itemName}</div>
            <div className="text-xs text-slate-400">货架: {shelfName}</div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs text-white ${getPriorityBgColor(
              order.priority
            )}`}
          >
            {getPriorityLabel(order.priority)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <Clock className={`w-3 h-3 ${isUrgent ? 'text-red-400' : 'text-slate-400'}`} />
            <span className={isUrgent ? 'text-red-400' : 'text-slate-300'}>
              {formatTime(order.remainingTime)}
            </span>
          </div>
          <div className="text-xs text-slate-400">+{order.reward}分</div>
        </div>
        <div className="mt-2 h-1 bg-slate-600 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isUrgent ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${timePercent}%` }}
          />
        </div>
        {order.status === 'pending' && selectedRobotId && (
          <button
            className="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            onClick={() => assignOrderToRobot(order.id, selectedRobotId)}
          >
            派单给选中机器人
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-xl max-h-96 overflow-y-auto">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-amber-400" />
        订单列表
      </h3>

      {pendingOrders.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">待处理 ({pendingOrders.length})</h4>
          <div className="space-y-2">{pendingOrders.map(renderOrder)}</div>
        </div>
      )}

      {assignedOrders.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">执行中 ({assignedOrders.length})</h4>
          <div className="space-y-2">{assignedOrders.map(renderOrder)}</div>
        </div>
      )}

      {completedOrders.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-green-400 mb-2">已完成 ({completedOrders.length})</h4>
          <div className="space-y-2">
            {completedOrders.map(order => (
              <div
                key={order.id}
                className="p-2 rounded-lg bg-green-900/30 text-green-300 text-sm"
              >
                ✓ {order.itemName} - {getShelfName(order.shelfId)}
              </div>
            ))}
          </div>
        </div>
      )}

      {timeoutOrders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            已超时 ({timeoutOrders.length})
          </h4>
          <div className="space-y-2">
            {timeoutOrders.map(order => (
              <div
                key={order.id}
                className="p-2 rounded-lg bg-red-900/30 text-red-300 text-sm"
              >
                ✗ {order.itemName} - {getShelfName(order.shelfId)}
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center text-slate-500 py-8">
          等待订单生成...
        </div>
      )}
    </div>
  );
}
