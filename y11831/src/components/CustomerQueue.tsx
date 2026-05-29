import { Users, Clock, Star, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Order } from '../types/game';

const priorityColors = {
  normal: 'bg-gray-100 border-gray-300',
  vip: 'bg-yellow-50 border-yellow-400',
  super_vip: 'bg-purple-50 border-purple-400',
};

const priorityBadge = {
  normal: { bg: 'bg-gray-200', text: 'text-gray-700', label: '普通' },
  vip: { bg: 'bg-yellow-200', text: 'text-yellow-800', label: 'VIP' },
  super_vip: { bg: 'bg-purple-200', text: 'text-purple-800', label: 'SVIP' },
};

const statusColors = {
  waiting: 'bg-blue-500',
  processing: 'bg-orange-500',
  completed: 'bg-green-500',
  timeout: 'bg-red-500',
  starved: 'bg-red-700',
};

export function CustomerQueue() {
  const { orders, currentTime, queueInstance } = useGameStore();
  const queuedOrders = queueInstance?.getAll() || [];

  const waitingOrders = orders.filter(
    (o) => o.status === 'waiting' && o.arriveTime <= currentTime
  );

  const OrderCard = ({ order }: { order: Order }) => {
    const isQueued = queuedOrders.some((q) => q.id === order.id);
    const badge = priorityBadge[order.priority];

    return (
      <div
        className={`p-3 rounded-lg border-2 ${priorityColors[order.priority]} transition-all hover:shadow-md`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
            <span className="font-medium text-gray-800">{order.customerName}</span>
          </div>
          <span className={`w-3 h-3 rounded-full ${statusColors[order.status]}`} />
        </div>

        <div className="text-sm text-gray-600 mb-2">
          {order.items.slice(0, 2).map((item, i) => (
            <span key={i} className="mr-2">
              {item.menuName} x{item.quantity}
            </span>
          ))}
          {order.items.length > 2 && <span>等{order.items.length}样</span>}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>桌号: {order.tableNumber}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>¥{order.totalPrice}</span>
          </div>
        </div>

        {isQueued && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            队列中
          </div>
        )}

        {currentTime > order.deadline && order.status === 'waiting' && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            已超时
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <Users className="w-5 h-5 text-amber-600" />
        <h2 className="text-lg font-bold text-gray-800">顾客队列</h2>
        <span className="ml-auto text-sm text-gray-500">
          等待: {waitingOrders.length}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {queuedOrders.length > 0 ? (
          queuedOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : waitingOrders.length > 0 ? (
          waitingOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无等待顾客</p>
          </div>
        )}
      </div>
    </div>
  );
}
