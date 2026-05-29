import { useGameStore } from '@/store/gameStore';
import type { Order, OrderPriority, Robot } from '@/engine/types';
import { AlertTriangle, Clock, Flame, Minus, ArrowRight } from 'lucide-react';

function getPriorityConfig(priority: OrderPriority) {
  switch (priority) {
    case 'urgent': return { label: '紧急', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: Flame };
    case 'normal': return { label: '普通', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Clock };
    case 'low': return { label: '低优', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Minus };
  }
}

function OrderCard({ order, robots, onAssign }: {
  order: Order;
  robots: Robot[];
  onAssign: (orderId: string, robotId: string) => void;
}) {
  const priorityConfig = getPriorityConfig(order.priority);
  const PriorityIcon = priorityConfig.icon;
  const idleRobots = robots.filter(r => r.state === 'idle');
  const timeLeft = order.timeLimit - order.elapsed;
  const isUrgent = timeLeft < 10 && timeLeft > 0;

  if (order.status === 'completed') return null;

  return (
    <div
      className={`rounded-lg p-2.5 border ${priorityConfig.border} ${priorityConfig.bg}`}
      style={{ backgroundColor: order.status === 'timeout' ? '#2a1010' : undefined }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <PriorityIcon size={12} className={priorityConfig.color} />
          <span className="text-white text-xs font-mono">{order.id}</span>
          <span className={`text-xs ${priorityConfig.color}`}>{priorityConfig.label}</span>
        </div>
        <div className={`text-xs font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>
          {order.status === 'timeout' ? '超时' : `${timeLeft}s`}
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-500 mb-2">
        <span>({order.shelfPosition.x},{order.shelfPosition.y})</span>
        <ArrowRight size={10} />
        <span>({order.dispatchPosition.x},{order.dispatchPosition.y})</span>
      </div>

      {order.status === 'timeout' && order.timeoutReason && (
        <div className="text-xs text-red-400 mb-2 flex items-center gap-1">
          <AlertTriangle size={10} />
          {order.timeoutReason === 'low_battery' && '电量不足'}
          {order.timeoutReason === 'path_collision' && '路径相撞'}
          {order.timeoutReason === 'blocked_aisle' && '货道堵塞'}
          {order.timeoutReason === 'no_available_robot' && '无可用机器人'}
        </div>
      )}

      {order.status === 'pending' && idleRobots.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {idleRobots.map(robot => (
            <button
              key={robot.id}
              onClick={() => onAssign(order.id, robot.id)}
              className="text-xs px-2 py-0.5 rounded border transition-all hover:scale-105"
              style={{
                borderColor: robot.color + '60',
                color: robot.color,
                backgroundColor: robot.color + '15',
              }}
            >
              {robot.name}
            </button>
          ))}
        </div>
      )}

      {order.status === 'pending' && idleRobots.length === 0 && (
        <div className="text-xs text-zinc-600">无空闲机器人</div>
      )}

      {order.status === 'in_progress' && (
        <div className="text-xs text-zinc-500">
          执行中 → {robots.find(r => r.id === order.assignedRobotId)?.name}
        </div>
      )}
    </div>
  );
}

export default function OrderQueue() {
  const orders = useGameStore(s => s.state.orders);
  const robots = useGameStore(s => s.state.robots);
  const assignOrder = useGameStore(s => s.assignOrder);

  const sortedOrders = [...orders].sort((a, b) => {
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    const statusOrder = { in_progress: 0, pending: 1, timeout: 2, completed: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">订单队列</div>
      {sortedOrders.length === 0 && (
        <div className="text-xs text-zinc-600 text-center py-4">等待订单生成...</div>
      )}
      {sortedOrders.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          robots={robots}
          onAssign={assignOrder}
        />
      ))}
    </div>
  );
}
