import React from 'react';
import { DollarSign, Clock, AlertCircle, Check, X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import { Order } from '@/types/game';

const OrderCard: React.FC<{
  order: Order;
  onAccept?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}> = ({ order, onAccept, onReject, showActions = false }) => {
  const inventory = useGameStore(state => state.inventory);
  const canAccept = order.amount <= inventory;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800',
    accepted: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    delivered: 'bg-emerald-100 text-emerald-800',
  };

  const statusText = {
    pending: '待处理',
    accepted: '已接受',
    cancelled: '已取消',
    delivered: '已交货',
  };

  return (
    <div className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              statusColors[order.status]
            )}
          >
            {statusText[order.status]}
          </span>
          <span className="text-xs text-slate-500">ID: {order.id.slice(0, 6)}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-sm">数量</span>
          <span className="font-semibold">{order.amount} 件</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-sm">单价</span>
          <span className="font-semibold">
            {order.currency} {order.unitPrice}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-sm">总金额</span>
          <span className="font-bold text-blue-600">
            {order.currency} {(order.amount * order.unitPrice).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            交货回合
          </span>
          <span className="font-semibold">第 {order.deliveryRound} 回合</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            取消风险
          </span>
          <span
            className={cn(
              'font-semibold',
              order.cancelProbability > 0.2 ? 'text-red-600' : 'text-amber-600'
            )}
          >
            {(order.cancelProbability * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-2">
          <Button
            variant="success"
            size="sm"
            className="flex-1"
            onClick={onAccept}
            disabled={!canAccept}
            title={!canAccept ? '库存不足' : ''}
          >
            <Check className="w-4 h-4 mr-1" />
            接单
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1"
            onClick={onReject}
          >
            <X className="w-4 h-4 mr-1" />
            拒单
          </Button>
        </div>
      )}
    </div>
  );
};

export const OrderPanel: React.FC = () => {
  const { pendingOrders, activeOrders, acceptOrder, rejectOrder } = useGameStore();

  const acceptedOrders = activeOrders.filter(o => o.status === 'accepted');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          订单管理
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {pendingOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">待接订单</h4>
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  showActions
                  onAccept={() => acceptOrder(order.id)}
                  onReject={() => rejectOrder(order.id)}
                />
              ))}
            </div>
          </div>
        )}

        {acceptedOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">进行中订单</h4>
            <div className="space-y-3">
              {acceptedOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )}

        {pendingOrders.length === 0 && acceptedOrders.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>暂无订单</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
