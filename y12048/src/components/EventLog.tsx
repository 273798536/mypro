import React from 'react';
import { Clock, User, Cpu, Database, ShieldAlert, UserCog } from 'lucide-react';
import { ActionRecord } from '../types/game';
import { useGameStore } from '../store/useGameStore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventLogProps {
  actions: ActionRecord[];
}

const sourceIcons: Record<string, React.ReactNode> = {
  player: <User className="w-3 h-3" />,
  system: <Cpu className="w-3 h-3" />,
  oracle: <Database className="w-3 h-3" />,
  liquidator: <ShieldAlert className="w-3 h-3" />,
};

const sourceColors: Record<string, string> = {
  player: 'bg-blue-500',
  system: 'bg-slate-500',
  oracle: 'bg-purple-500',
  liquidator: 'bg-red-500',
};

const typeColors: Record<string, string> = {
  add_collateral: 'text-emerald-400',
  repay: 'text-blue-400',
  hold: 'text-slate-400',
  liquidation: 'text-red-400',
  price_update: 'text-purple-400',
};

const typeLabels: Record<string, string> = {
  add_collateral: '补抵押物',
  repay: '还债',
  hold: '观望',
  liquidation: '清算',
  price_update: '价格更新',
};

export const EventLog: React.FC<EventLogProps> = ({ actions }) => {
  const { selectedTraceId, selectTrace } = useGameStore();

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
      {actions.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          暂无操作记录
        </div>
      ) : (
        [...actions].reverse().map((action) => (
          <div
            key={action.id}
            onClick={() => selectTrace(selectedTraceId === action.id ? null : action.id)}
            className={cn(
              'p-3 rounded-lg border transition-all duration-200 cursor-pointer',
              selectedTraceId === action.id
                ? 'bg-slate-700/50 border-violet-500 ring-1 ring-violet-500/50'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'p-1 rounded text-white',
                  sourceColors[action.source]
                )}>
                  {sourceIcons[action.source]}
                </span>
                <span className={cn(
                  'text-xs font-medium',
                  typeColors[action.type]
                )}>
                  {typeLabels[action.type]}
                </span>
                <span className="text-xs text-slate-500">
                  R{action.round}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {format(action.timestamp, 'HH:mm:ss')}
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-2">{action.explanation}</p>
            
            <div className="flex items-center justify-between">
              <span className={cn(
                'text-xs font-mono font-bold',
                action.scoreChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange} 分
              </span>
              
              {action.isRevised && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <UserCog className="w-3 h-3" />
                  <span>已修订</span>
                </div>
              )}
            </div>
            
            {selectedTraceId === action.id && (
              <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">抵押率:</span>
                    <span className="ml-1 text-slate-300 font-mono">
                      {action.positionSnapshot.currentRatio.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">价格:</span>
                    <span className="ml-1 text-slate-300 font-mono">
                      ${action.priceSnapshot.price.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">抵押物:</span>
                    <span className="ml-1 text-slate-300 font-mono">
                      {action.positionSnapshot.collateralAmount.toFixed(2)} {action.positionSnapshot.collateralType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">借贷:</span>
                    <span className="ml-1 text-slate-300 font-mono">
                      ${action.positionSnapshot.borrowAmount.toFixed(0)}
                    </span>
                  </div>
                </div>
                
                {action.isRevised && action.revisionNote && (
                  <div className="p-2 bg-amber-500/10 rounded border border-amber-500/30">
                    <div className="text-xs text-amber-400 mb-1">
                      修订人: {action.revisedBy} · {action.revisedAt && format(action.revisedAt, 'MM-dd HH:mm')}
                    </div>
                    <div className="text-xs text-amber-200">
                      {action.revisionNote}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
