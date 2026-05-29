import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Order } from '../../engine/types';
import { GAME_CONFIG } from '../../engine/config';
import { formatPrice } from '../../utils/format';

interface QuotePanelProps {
  currentPrice: number;
  activeOrders: Order[];
  onPlaceOrder: (side: 'buy' | 'sell', price: number, quantity: number) => boolean;
  onCancelOrder: (orderId: string) => void;
  disabled?: boolean;
  selectedPrice?: number;
}

export const QuotePanel: React.FC<QuotePanelProps> = ({
  currentPrice,
  activeOrders,
  onPlaceOrder,
  onCancelOrder,
  disabled,
  selectedPrice,
}) => {
  const [buyPrice, setBuyPrice] = useState<number>(currentPrice - 0.5);
  const [sellPrice, setSellPrice] = useState<number>(currentPrice + 0.5);
  const [quantity, setQuantity] = useState<number>(GAME_CONFIG.ORDER_QUANTITY);

  useEffect(() => {
    if (selectedPrice !== undefined && selectedPrice > 0) {
      if (selectedPrice < currentPrice) {
        setBuyPrice(+selectedPrice.toFixed(2));
      } else if (selectedPrice > currentPrice) {
        setSellPrice(+selectedPrice.toFixed(2));
      } else {
        setBuyPrice(+(selectedPrice - 0.1).toFixed(2));
        setSellPrice(+(selectedPrice + 0.1).toFixed(2));
      }
    }
  }, [selectedPrice, currentPrice]);

  const handlePriceAdjust = (side: 'buy' | 'sell', delta: number) => {
    if (side === 'buy') {
      setBuyPrice(p => +(p + delta).toFixed(2));
    } else {
      setSellPrice(p => +(p + delta).toFixed(2));
    }
  };

  const handlePlaceOrder = (side: 'buy' | 'sell') => {
    const price = side === 'buy' ? buyPrice : sellPrice;
    if (price <= 0) return;
    
    const success = onPlaceOrder(side, price, quantity);
    if (success && side === 'buy') {
      setBuyPrice(p => +(p - 0.1).toFixed(2));
    } else if (success && side === 'sell') {
      setSellPrice(p => +(p + 0.1).toFixed(2));
    }
  };

  const buyOrders = activeOrders.filter(o => o.side === 'buy' && o.status === 'active');
  const sellOrders = activeOrders.filter(o => o.side === 'sell' && o.status === 'active');
  const spread = sellPrice - buyPrice;

  return (
    <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden">
      <div className="px-4 py-2 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-gray-300">报价面板</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">买单价格</label>
              <div className="flex items-center gap-1">
                <button
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                  onClick={() => handlePriceAdjust('buy', -0.1)}
                  disabled={disabled}
                >
                  <Minus size={12} />
                </button>
                <button
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                  onClick={() => handlePriceAdjust('buy', 0.1)}
                  disabled={disabled}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(+e.target.value)}
              step="0.01"
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-trade-up font-mono text-center focus:outline-none focus:border-trade-up"
              disabled={disabled}
            />
            <button
              className="w-full py-2 rounded bg-trade-up/20 hover:bg-trade-up/30 text-trade-up font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handlePlaceOrder('buy')}
              disabled={disabled || buyOrders.length >= GAME_CONFIG.MAX_ORDERS_PER_SIDE}
            >
              挂买单 ({buyOrders.length}/{GAME_CONFIG.MAX_ORDERS_PER_SIDE})
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">卖单价格</label>
              <div className="flex items-center gap-1">
                <button
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                  onClick={() => handlePriceAdjust('sell', -0.1)}
                  disabled={disabled}
                >
                  <Minus size={12} />
                </button>
                <button
                  className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                  onClick={() => handlePriceAdjust('sell', 0.1)}
                  disabled={disabled}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(+e.target.value)}
              step="0.01"
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-trade-down font-mono text-center focus:outline-none focus:border-trade-down"
              disabled={disabled}
            />
            <button
              className="w-full py-2 rounded bg-trade-down/20 hover:bg-trade-down/30 text-trade-down font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => handlePlaceOrder('sell')}
              disabled={disabled || sellOrders.length >= GAME_CONFIG.MAX_ORDERS_PER_SIDE}
            >
              挂卖单 ({sellOrders.length}/{GAME_CONFIG.MAX_ORDERS_PER_SIDE})
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-terminal-bg rounded px-3 py-2">
          <span className="text-xs text-gray-400">当前价差</span>
          <span className="font-mono text-white">{formatPrice(spread)}</span>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs text-gray-400">下单数量</label>
          <div className="flex items-center gap-2">
            <button
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={disabled}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-center font-mono focus:outline-none focus:border-blue-500"
              disabled={disabled}
            />
            <button
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
              onClick={() => setQuantity(q => q + 1)}
              disabled={disabled}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        
        {activeOrders.filter(o => o.status === 'active').length > 0 && (
          <div className="border-t border-terminal-border pt-4">
            <h4 className="text-xs text-gray-400 mb-2">活跃订单</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeOrders.filter(o => o.status === 'active').map(order => (
                <div
                  key={order.id}
                  className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                    order.side === 'buy' ? 'bg-trade-up/10' : 'bg-trade-down/10'
                  }`}
                >
                  <span className={order.side === 'buy' ? 'text-trade-up' : 'text-trade-down'}>
                    {order.side === 'buy' ? '买' : '卖'} {order.quantity} @ {formatPrice(order.price)}
                  </span>
                  <button
                    className="text-gray-400 hover:text-white"
                    onClick={() => onCancelOrder(order.id)}
                    disabled={disabled}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
