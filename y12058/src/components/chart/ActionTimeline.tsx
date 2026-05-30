import React from 'react';
import { Flame, Snowflake, RotateCw, Coffee } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { formatActionType } from '@/utils/export';
import { GameAction } from '@/types';

const getActionIcon = (type: string) => {
  switch (type) {
    case 'heat': return <Flame size={16} className="text-orange-500" />;
    case 'ice': return <Snowflake size={16} className="text-blue-500" />;
    case 'stir': return <RotateCw size={16} className="text-amber-500" />;
    case 'pour': return <Coffee size={16} className="text-coffee-dark" />;
    default: return null;
  }
};

export const ActionTimeline: React.FC = () => {
  const { actions } = useGameStore();

  if (actions.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4 font-display">操作记录</h3>
        <div className="text-center text-gray-500 py-8">
          暂无操作记录
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display">操作记录</h3>
      
      <div className="max-h-80 overflow-y-auto">
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
          
          {actions.map((action: GameAction, index: number) => (
            <div key={action.id} className="relative pl-10 pb-6 last:pb-0">
              <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-coffee-dark flex items-center justify-center">
                {getActionIcon(action.type)}
              </div>
              
              <div className={`p-3 rounded-lg ${
                action.heatExchange.isAbnormal 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">
                      {index + 1}. {formatActionType(action.type)}
                    </span>
                    {action.heatExchange.isAbnormal && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        ⚠️ {action.heatExchange.abnormalType === 'conservation' 
                          ? '守恒异常' 
                          : '温度越界'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-2">
                  <div>温度变化: {action.heatExchange.deltaT > 0 ? '+' : ''}{action.heatExchange.deltaT.toFixed(2)}°C</div>
                  <div>热量输入: {action.heatExchange.Q_in.toFixed(0)} J</div>
                  <div>热量输出: {action.heatExchange.Q_out.toFixed(0)} J</div>
                  <div>
                    守恒校验: 
                    <span className={action.heatExchange.conservationCheck ? 'text-green-600' : 'text-red-600'}>
                      {' '}{action.heatExchange.conservationCheck ? '通过' : '失败'}
                    </span>
                  </div>
                </div>
                
                {action.heatExchange.errorMargin > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    守恒误差: {(action.heatExchange.errorMargin * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
