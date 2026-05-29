import React from 'react';
import { MapPin, AlertTriangle, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import type { Level, GameState } from '../../data/types';
import { getDeliveryRouteSequence } from '../../utils/orderValidator';
import { getZoneColorClass } from '../../utils/zoneValidator';
import { cn } from '@/lib/utils';

interface RouteSequenceProps {
  level: Level;
  gameState: GameState;
}

const RouteSequence: React.FC<RouteSequenceProps> = ({ level, gameState }) => {
  const placementsWithDetails = gameState.placements.map(p => {
    const cargoBox = level.cargoBoxes.find(c => c.id === p.cargoBoxId)!;
    const compartment = level.compartments.find(c => c.id === p.compartmentId)!;
    return { cargoBox, compartment, placement: p };
  });

  const sequence = getDeliveryRouteSequence(placementsWithDetails);

  const groupedByOrder = sequence.reduce((acc, item) => {
    if (!acc[item.order]) {
      acc[item.order] = [];
    }
    acc[item.order].push(item);
    return acc;
  }, {} as Record<number, typeof sequence>);

  const orders = Object.keys(groupedByOrder)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-6">
      <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-cold-chain-primary" />
        卸货路线顺序
      </h2>

      <div className="relative">
        {orders.map((order, orderIndex) => {
          const items = groupedByOrder[order];
          const hasBlocked = items.some(item => item.isBlocked);
          const destination = items[0]?.cargoBox.destination || `第${order}站`;

          return (
            <div key={order} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold',
                    hasBlocked
                      ? 'bg-cold-chain-danger'
                      : 'bg-cold-chain-success'
                  )}>
                    {order}
                  </div>
                  {orderIndex < orders.length - 1 && (
                    <div className="w-0.5 h-full min-h-[80px] bg-cold-chain-border" />
                  )}
                </div>

                <div className="flex-1 pb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono font-bold text-lg text-white">
                      {destination}
                    </span>
                    {hasBlocked ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-cold-chain-danger/20 text-cold-chain-danger rounded text-xs font-mono">
                        <AlertTriangle className="w-3 h-3" />
                        有货物被挡住
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-cold-chain-success/20 text-cold-chain-success rounded text-xs font-mono">
                        <CheckCircle className="w-3 h-3" />
                        顺序正确
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {items.map((item) => (
                      <div
                        key={item.cargoBox.id}
                        className={cn(
                          'relative p-3 rounded-lg border-2 min-w-[200px]',
                          item.isBlocked
                            ? 'border-cold-chain-danger bg-cold-chain-danger/10'
                            : 'border-cold-chain-success/50 bg-cold-chain-success/5',
                          getZoneColorClass(item.cargoBox.temperatureZone).replace('bg-', 'border-').split(' ')[0]
                        )}
                      >
                        {item.isBlocked && (
                          <div className="absolute -top-2 -right-2">
                            <XCircle className="w-5 h-5 text-cold-chain-danger" />
                          </div>
                        )}
                        <div className="font-mono text-sm font-bold text-white mb-1">
                          {item.cargoBox.originalName}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          位置: {item.compartment.originalName}
                        </div>
                        {item.isBlocked && item.blockedBy && (
                          <div className="mt-2 text-xs text-cold-chain-danger font-mono">
                            ⚠️ 被「{item.blockedBy}」挡住
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {orderIndex < orders.length - 1 && (
                  <div className="flex items-center pt-4">
                    <ArrowRight className="w-5 h-5 text-cold-chain-border" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
        <h4 className="font-mono text-sm font-bold text-gray-300 mb-2">图例说明</h4>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cold-chain-success" />
            <span className="text-gray-400">顺序正确</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cold-chain-danger" />
            <span className="text-gray-400">有货物被挡住</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSequence;
