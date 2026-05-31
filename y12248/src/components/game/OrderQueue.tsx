import { OrderCard } from './OrderCard';
import { useGameStore } from '../../store/gameStore';
import { scheduleOrders } from '../../utils/schedulers';
import { useEffect, useState } from 'react';

export function OrderQueue() {
  const { orders, queueScheduler, status } = useGameStore();
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    if (status !== 'playing') return;
    
    const interval = setInterval(() => {
      setNow(performance.now());
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
  const scheduledOrders = scheduleOrders(orders, queueScheduler);
  const processingOrders = orders.filter(o => o.status === 'processing');

  return (
    <div className="h-full flex flex-col bg-[#252220] rounded-xl border-2 border-[#5D554D] p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xl">📋</span>
            订单队列
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            待处理: {pendingOrders.length} | 处理中: {processingOrders.length}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500">调度模式</span>
          <div className="text-sm font-bold text-[#FF7A18]">
            {queueScheduler === 'priority' ? '优先级' : 
             queueScheduler === 'fifo' ? '先进先出' : '后进先出'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <span className="text-4xl mb-2">🍽️</span>
            <p className="text-sm">暂无订单，等待顾客...</p>
          </div>
        ) : (
          scheduledOrders.map((order) => (
            <OrderCard key={order.id} order={order} now={now} />
          ))
        )}
      </div>
    </div>
  );
}
