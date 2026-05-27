import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { GAME_CONFIG } from '@/constants/config';
import { calculateForwardRate } from '@/utils/exchange';
import { cn } from '@/lib/utils';

export const HedgingPanel: React.FC = () => {
  const { activeOrders, activeContracts, exchangeRate, round, cash, createHedge } =
    useGameStore();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [hedgeAmount, setHedgeAmount] = useState<number>(0);

  const acceptedOrders = activeOrders.filter(o => o.status === 'accepted');
  const selectedOrder = acceptedOrders.find(o => o.id === selectedOrderId);

  const existingHedgeForOrder = activeContracts
    .filter(c => c.orderId === selectedOrderId && c.status === 'active')
    .reduce((sum, c) => sum + c.amount, 0);

  const maxAllowedHedge = selectedOrder
    ? Math.floor(selectedOrder.amount * GAME_CONFIG.OVER_HEDGING_THRESHOLD)
    : 0;
  const remainingHedge = Math.max(0, maxAllowedHedge - existingHedgeForOrder);

  const deliveryRounds = selectedOrder ? selectedOrder.deliveryRound - round : 0;
  const forwardRate = selectedOrder
    ? calculateForwardRate(exchangeRate, deliveryRounds)
    : 0;
  const feeRate = GAME_CONFIG.FORWARD_CONTRACT_FEE_RATE;
  const estimatedFee = hedgeAmount * forwardRate * feeRate;
  const canCreateHedge =
    selectedOrder &&
    hedgeAmount > 0 &&
    hedgeAmount <= remainingHedge &&
    estimatedFee <= cash;

  const handleCreateHedge = () => {
    if (selectedOrderId && hedgeAmount > 0) {
      createHedge(selectedOrderId, hedgeAmount);
      setHedgeAmount(0);
    }
  };

  const activeContractsList = activeContracts.filter(c => c.status === 'active');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          远期锁汇
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {acceptedOrders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">选择订单</h4>
            <div className="space-y-2">
              {acceptedOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setHedgeAmount(0);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    selectedOrderId === order.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-900">
                      {order.currency} {order.amount} 件
                    </span>
                    <span className="text-xs text-slate-500">
                      交货: R{order.deliveryRound}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    总金额: {order.currency} {(order.amount * order.unitPrice).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedOrder && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-slate-700">锁汇操作</h4>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">远期汇率</span>
                <p className="font-bold text-blue-600">{forwardRate.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-slate-500">手续费率</span>
                <p className="font-medium">{(feeRate * 100).toFixed(2)}%</p>
              </div>
              <div>
                <span className="text-slate-500">最大可锁</span>
                <p className="font-medium">{maxAllowedHedge} 件</p>
              </div>
              <div>
                <span className="text-slate-500">已锁金额</span>
                <p className="font-medium">{existingHedgeForOrder} 件</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-600 block mb-1">
                锁汇金额 (剩余可锁: {remainingHedge} 件)
              </label>
              <input
                type="range"
                min="0"
                max={remainingHedge}
                value={hedgeAmount}
                onChange={e => setHedgeAmount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span className="font-medium">{hedgeAmount} 件</span>
                <span>{remainingHedge}</span>
              </div>
            </div>

            <div className="p-2 bg-white rounded border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">预计手续费</span>
                <span className="font-medium">¥{estimatedFee.toFixed(2)}</span>
              </div>
            </div>

            {hedgeAmount > remainingHedge && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>锁汇金额超过订单金额的120%，将被罚款！</span>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full"
              onClick={handleCreateHedge}
              disabled={!canCreateHedge}
            >
              <Shield className="w-4 h-4 mr-2" />
              确认锁汇
            </Button>
          </div>
        )}

        {activeContractsList.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              有效合约
            </h4>
            <div className="space-y-2">
              {activeContractsList.map(contract => {
                const order = activeOrders.find(o => o.id === contract.orderId);
                return (
                  <div
                    key={contract.id}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-900">
                        锁定汇率: {contract.lockedRate.toFixed(4)}
                      </span>
                      <span className="text-xs text-blue-700">
                        {contract.amount} 件
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      到期回合: R{contract.maturityRound}
                      {order && ` | 订单: ${order.currency}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {acceptedOrders.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>先接受订单，再进行锁汇操作</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
