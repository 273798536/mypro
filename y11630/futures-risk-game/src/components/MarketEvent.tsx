import React from 'react';
import { TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react';
import { useGameEngine } from '../hooks/useGameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { getContract } from '../utils/marginCalculator';
import type { MarketEvent } from '../types';

export const MarketEventList: React.FC = () => {
  const { state } = useGameEngine();
  const { marketEvents } = state;

  const getEventIcon = (event: MarketEvent) => {
    if (event.isExtreme) {
      return <Zap className="w-5 h-5 text-red-500" />;
    }
    return event.priceChangePercent >= 0
      ? <TrendingUp className="w-5 h-5 text-green-500" />
      : <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getEventColor = (event: MarketEvent) => {
    if (event.isExtreme) return 'bg-red-50 border-red-200';
    return event.priceChangePercent >= 0
      ? 'bg-green-50 border-green-200'
      : 'bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-bold text-gray-800">行情事件</h3>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
        <AnimatePresence>
          {marketEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>等待行情变化...</p>
            </div>
          ) : (
            [...marketEvents].reverse().map((event, index) => {
              const contract = getContract(event.contractCode);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${getEventColor(event)} ${
                    event.isExtreme ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {getEventIcon(event)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">
                          第{event.roundNumber}回合 - {contract?.name || event.contractCode}
                        </span>
                        <span className={`text-sm font-mono font-bold ${
                          event.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {event.priceChangePercent >= 0 ? '+' : ''}
                          {event.priceChangePercent.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                      {event.isExtreme && (
                        <span className="inline-block mt-1 px-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          极端行情
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
