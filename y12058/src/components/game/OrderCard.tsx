import React from 'react';
import { Clock, Thermometer, Droplets } from 'lucide-react';
import { Order } from '@/types';
import { useGameStore } from '@/store/gameStore';

interface OrderCardProps {
  order: Order | null;
  remainingTime: number;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, remainingTime }) => {
  const { badRows } = useGameStore();
  
  if (!order) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-display text-center">顾客订单</h3>
        <div className="text-center text-gray-500 py-8">
          请选择一个订单开始游戏
        </div>
      </div>
    );
  }

  const timePercentage = Math.max(0, (remainingTime / order.timeLimit) * 100);
  const isUrgent = remainingTime < order.timeLimit * 0.3;

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold font-display">订单 #{order.id}</h3>
          <p className="text-sm text-gray-500">{order.note || '标准咖啡'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          order.source === 'customer' ? 'bg-green-100 text-green-700' :
          order.source === 'stir' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {order.source === 'customer' ? '顾客' : order.source === 'stir' ? '搅拌任务' : '手动'}
        </span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Thermometer className="text-orange-500" size={20} />
          <div className="flex-1">
            <div className="text-sm text-gray-500">目标温度</div>
            <div className="font-bold text-lg">{order.targetTemperature}°C</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Droplets className="text-blue-500" size={20} />
          <div className="flex-1">
            <div className="text-sm text-gray-500">容量</div>
            <div className="font-bold text-lg">{order.capacity} ml</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Clock className={isUrgent ? 'text-red-500' : 'text-gray-500'} size={20} />
          <div className="flex-1">
            <div className="text-sm text-gray-500">剩余时间</div>
            <div className={`font-bold text-lg ${isUrgent ? 'text-red-500' : ''}`}>
              {Math.max(0, remainingTime).toFixed(0)} 秒
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {badRows.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-sm font-medium text-yellow-800">
            ⚠️ 检测到 {badRows.length} 条坏行数据已被过滤
          </div>
        </div>
      )}
    </div>
  );
};
