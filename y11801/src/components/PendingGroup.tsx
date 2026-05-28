import { AlertTriangle, RefreshCw, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PendingCard } from './PendingCard';
import Empty from './Empty';
import type { PendingItem, PendingType } from 'shared/types';
import { PENDING_TYPE_CONFIG } from 'shared/constants';

interface PendingGroupProps {
  type: PendingType;
  items: PendingItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  newItemIds: Set<string>;
}

const iconMap: Record<PendingType, typeof AlertTriangle> = {
  residual_expired: AlertTriangle,
  contract_replaced: RefreshCw,
  subsidy_clawback: DollarSign,
};

const colorMap: Record<PendingType, string> = {
  residual_expired: 'border-red-500 text-red-600 bg-red-50',
  contract_replaced: 'border-amber-500 text-amber-600 bg-amber-50',
  subsidy_clawback: 'border-red-500 text-red-600 bg-red-50',
};

export function PendingGroup({ type, items, selectedIds, onSelect, newItemIds }: PendingGroupProps) {
  const config = PENDING_TYPE_CONFIG[type];
  const Icon = iconMap[type];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className={cn('px-4 py-3 border-l-4 flex items-center justify-between', colorMap[type])}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-semibold">{config.label}</span>
        </div>
        <span className="px-2.5 py-1 bg-white rounded-full text-sm font-bold shadow-sm">
          {items.length}
        </span>
      </div>

      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
        {items.length === 0 ? (
          <Empty />
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <PendingCard
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onSelect={onSelect}
                isNew={newItemIds.has(item.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
