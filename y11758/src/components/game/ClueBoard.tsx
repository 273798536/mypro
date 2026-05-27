import React from 'react';
import { Lightbulb, Trash2 } from 'lucide-react';
import { Card as CardType } from '@/types';
import { Card } from './Card';

interface ClueBoardProps {
  selectedCards: CardType[];
  onRemoveCard: (cardId: string) => void;
  detectedAnomalies: any[];
}

export const ClueBoard: React.FC<ClueBoardProps> = ({
  selectedCards,
  onRemoveCard,
  detectedAnomalies,
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
        <div className="flex items-center gap-2 text-amber-400">
          <Lightbulb className="w-5 h-5" />
          <span className="font-bold text-lg">线索板</span>
          <span className="ml-auto text-sm text-slate-400">
            已选 {selectedCards.length} 张
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selectedCards.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>点击卡牌添加到线索板</p>
            <p className="text-sm">系统将自动分析关联关系</p>
          </div>
        ) : (
          selectedCards.map(card => (
            <div key={card.id} className="relative group">
              <Card card={card} compact />
              <button
                onClick={() => onRemoveCard(card.id)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}

        {detectedAnomalies.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              检测到 {detectedAnomalies.length} 个可疑线索
            </h4>
            <div className="space-y-2">
              {detectedAnomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm"
                >
                  <div className="text-red-400 font-medium">
                    {anomaly.type === 'duplicate_invoice' && '🔴 同票重复'}
                    {anomaly.type === 'mismatch_chain' && '🔴 上下游不匹配'}
                    {anomaly.type === 'delayed_payment' && '🟠 付款滞后'}
                    {anomaly.type === 'amount_anomaly' && '🟠 金额异常'}
                  </div>
                  <div className="text-slate-300 mt-1 text-xs">
                    {anomaly.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
