import React from 'react';
import { OrderBook as OrderBookType } from '../../engine/types';
import { formatPrice } from '../../utils/format';

interface OrderBookProps {
  orderBook: OrderBookType;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
  selectedPrice?: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({ orderBook, onPriceClick, selectedPrice }) => {
  return (
    <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden">
      <div className="px-4 py-2 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-gray-300">订单簿</h3>
      </div>
      
      <div className="grid grid-cols-3 text-xs text-gray-500 px-4 py-1 border-b border-terminal-border">
        <span>价格</span>
        <span className="text-right">数量</span>
        <span className="text-right">累计</span>
      </div>
      
      <div className="max-h-64 overflow-hidden">
        <div className="flex flex-col-reverse">
          {orderBook.asks.map((level, idx) => {
            const totalQty = orderBook.asks.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0);
            const maxQty = Math.max(...orderBook.asks.map(l => l.quantity), 1);
            const barWidth = (level.quantity / maxQty) * 100;
            const isSelected = selectedPrice === level.price;
            
            return (
              <div
                key={`ask-${idx}`}
                className={`grid grid-cols-3 px-4 py-0.5 text-xs cursor-pointer hover:bg-gray-700/30 relative ${
                  isSelected ? 'bg-blue-500/20' : ''
                }`}
                onClick={() => onPriceClick?.(level.price, 'sell')}
              >
                <div
                  className="absolute inset-0 bg-red-500/20"
                  style={{ width: `${barWidth}%`, marginLeft: 'auto' }}
                />
                <span className="text-trade-down relative z-10 font-mono">{formatPrice(level.price)}</span>
                <span className="text-right text-gray-300 relative z-10">{level.quantity}</span>
                <span className="text-right text-gray-500 relative z-10">{totalQty}</span>
              </div>
            );
          })}
        </div>
        
        <div className="px-4 py-2 bg-terminal-bg border-y border-terminal-border">
          <div className="text-center">
            <span className="text-lg font-bold font-mono text-white">
              {formatPrice(orderBook.lastPrice)}
            </span>
          </div>
        </div>
        
        <div>
          {orderBook.bids.map((level, idx) => {
            const totalQty = orderBook.bids.slice(0, idx + 1).reduce((sum, l) => sum + l.quantity, 0);
            const maxQty = Math.max(...orderBook.bids.map(l => l.quantity), 1);
            const barWidth = (level.quantity / maxQty) * 100;
            const isSelected = selectedPrice === level.price;
            
            return (
              <div
                key={`bid-${idx}`}
                className={`grid grid-cols-3 px-4 py-0.5 text-xs cursor-pointer hover:bg-gray-700/30 relative ${
                  isSelected ? 'bg-blue-500/20' : ''
                }`}
                onClick={() => onPriceClick?.(level.price, 'buy')}
              >
                <div
                  className="absolute inset-0 bg-green-500/20"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="text-trade-up relative z-10 font-mono">{formatPrice(level.price)}</span>
                <span className="text-right text-gray-300 relative z-10">{level.quantity}</span>
                <span className="text-right text-gray-500 relative z-10">{totalQty}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
