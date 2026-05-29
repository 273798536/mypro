import React from 'react';
import { AlertTriangle, Thermometer, Package, XCircle, Clock } from 'lucide-react';
import type { FailureReason } from '../../data/types';
import { cn } from '@/lib/utils';

interface FailureListProps {
  failures: FailureReason[];
}

const FailureList: React.FC<FailureListProps> = ({ failures }) => {
  const groupedByType = failures.reduce((acc, failure) => {
    if (!acc[failure.type]) {
      acc[failure.type] = [];
    }
    acc[failure.type].push(failure);
    return acc;
  }, {} as Record<string, FailureReason[]>);

  const typeConfig: Record<string, {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }> = {
    zone_mismatch: {
      label: '温层混放',
      icon: Thermometer,
      color: 'text-cold-chain-danger',
      bgColor: 'bg-cold-chain-danger/10',
    },
    delivery_order_blocked: {
      label: '卸货顺序错误',
      icon: Package,
      color: 'text-cold-chain-warning',
      bgColor: 'bg-cold-chain-warning/10',
    },
    timeout: {
      label: '超时升温',
      icon: Clock,
      color: 'text-cold-chain-danger',
      bgColor: 'bg-cold-chain-danger/10',
    },
  };

  if (failures.length === 0) {
    return (
      <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-success/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-cold-chain-success/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-cold-chain-success" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-cold-chain-success">
              完美通关！
            </h2>
            <p className="text-gray-400 font-mono text-sm">
              未发现任何违规操作
            </p>
          </div>
        </div>
        <div className="p-4 bg-cold-chain-success/10 rounded-lg border border-cold-chain-success/30">
          <p className="text-sm text-gray-300 font-mono">
            恭喜！所有货物均按正确温层放置，卸货顺序合理，装车时间符合要求。
          </p>
        </div>
      </div>
    );
  }

  const zoneMismatchCount = groupedByType.zone_mismatch?.length || 0;
  const orderBlockedCount = groupedByType.delivery_order_blocked?.length || 0;
  const timeoutCount = groupedByType.timeout?.length || 0;

  return (
    <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-6">
      <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
        <XCircle className="w-5 h-5 text-cold-chain-danger" />
        问题明细
        <span className="ml-2 px-2 py-0.5 bg-cold-chain-danger/20 text-cold-chain-danger rounded text-sm font-mono">
          共 {failures.length} 项
        </span>
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-cold-chain-danger/10 rounded-lg border border-cold-chain-danger/30 text-center">
          <div className="font-mono text-2xl font-bold text-cold-chain-danger">
            {zoneMismatchCount}
          </div>
          <div className="text-xs text-gray-400 font-mono">温层混放</div>
        </div>
        <div className="p-3 bg-cold-chain-warning/10 rounded-lg border border-cold-chain-warning/30 text-center">
          <div className="font-mono text-2xl font-bold text-cold-chain-warning">
            {orderBlockedCount}
          </div>
          <div className="text-xs text-gray-400 font-mono">顺序错误</div>
        </div>
        <div className="p-3 bg-cold-chain-danger/10 rounded-lg border border-cold-chain-danger/30 text-center">
          <div className="font-mono text-2xl font-bold text-cold-chain-danger">
            {timeoutCount}
          </div>
          <div className="text-xs text-gray-400 font-mono">超时升温</div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByType).map(([type, typeFailures]) => {
          const config = typeConfig[type];
          const Icon = config.icon;

          return (
            <div key={type} className={cn('rounded-lg border-2 p-4', config.bgColor, `border-${config.color.replace('text-', '')}/30`)}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn('w-5 h-5', config.color)} />
                <h3 className={cn('font-mono font-bold', config.color)}>
                  {config.label} ({typeFailures.length}项)
                </h3>
              </div>

              <div className="space-y-3">
                {typeFailures.map((failure, index) => (
                  <div
                    key={`${failure.type}-${failure.cargoBoxId}-${index}`}
                    className="p-3 bg-cold-chain-dark/50 rounded-lg border border-cold-chain-border/50"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-gray-500 mt-0.5">#{index + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 font-mono leading-relaxed">
                          {failure.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-cold-chain-primary/20 text-cold-chain-primary rounded text-xs font-mono">
                            货箱: {failure.originalNames.cargoBox}
                          </span>
                          {failure.originalNames.compartment && (
                            <span className="px-2 py-0.5 bg-cold-chain-chilled/20 text-cold-chain-chilled rounded text-xs font-mono">
                              格位: {failure.originalNames.compartment}
                            </span>
                          )}
                          {failure.originalNames.blockedByBox && (
                            <span className="px-2 py-0.5 bg-cold-chain-warning/20 text-cold-chain-warning rounded text-xs font-mono">
                              阻挡: {failure.originalNames.blockedByBox}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
        <h4 className="font-mono text-sm font-bold text-cold-chain-primary mb-2">
          核心问题回答
        </h4>
        <p className="text-sm font-mono">
          <span className="text-gray-400">问：温层混放有没有被拦住？</span>
          <br />
          <span className={zoneMismatchCount > 0 ? 'text-cold-chain-danger' : 'text-cold-chain-success'}>
            答：{zoneMismatchCount > 0
              ? `否，共检测到 ${zoneMismatchCount} 处温层混放问题，需要立即整改。`
              : '是，未检测到温层混放问题，所有货物均按正确温层放置。'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default FailureList;
