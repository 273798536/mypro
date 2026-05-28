import { useState } from 'react';
import { Check, X, MessageSquare, AlertTriangle, RefreshCw, DollarSign } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { pendingService } from '../services';
import type { PendingItem, PendingType } from 'shared/types';
import { PENDING_TYPE_CONFIG } from 'shared/constants';

interface PendingCardProps {
  item: PendingItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isNew?: boolean;
}

const iconMap: Record<PendingType, typeof AlertTriangle> = {
  residual_expired: AlertTriangle,
  contract_replaced: RefreshCw,
  subsidy_clawback: DollarSign,
};

const levelColorMap = {
  high: 'border-red-500 bg-red-50',
  medium: 'border-amber-500 bg-amber-50',
  low: 'border-slate-500 bg-slate-50',
};

const levelTextColorMap = {
  high: 'text-red-700',
  medium: 'text-amber-700',
  low: 'text-slate-700',
};

export function PendingCard({ item, isSelected, onSelect, isNew }: PendingCardProps) {
  const queryClient = useQueryClient();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(item.note || '');
  const config = PENDING_TYPE_CONFIG[item.type];
  const Icon = iconMap[item.type];

  const confirmMutation = useMutation({
    mutationFn: () => pendingService.confirmItem(item.id, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: () => pendingService.ignoreItem(item.id, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
    },
  });

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  const handleIgnore = () => {
    ignoreMutation.mutate();
  };

  return (
    <div
      className={cn(
        'relative bg-white rounded-lg border-l-4 border shadow-sm overflow-hidden transition-all duration-300',
        levelColorMap[item.level],
        isNew && 'animate-[pulse_2s_ease-in-out_3]',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', levelTextColorMap[item.level])} />
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded', levelTextColorMap[item.level], 'bg-white/80')}>
                  {config.label}
                </span>
                <span className="text-xs text-slate-500">#{item.relatedRecordId.slice(0, 8)}</span>
              </div>
              {item.remainingDays !== undefined && (
                <span className={cn(
                  'text-xs font-medium px-2 py-1 rounded',
                  item.remainingDays <= 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                )}>
                  剩余 {item.remainingDays} 天
                </span>
              )}
            </div>
            <h4 className="font-semibold text-slate-800 mb-1">{item.title}</h4>
            <p className="text-sm text-slate-600">{item.description}</p>

            {showNote && (
              <div className="mt-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="添加备注..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                确认
              </button>
              <button
                onClick={handleIgnore}
                disabled={ignoreMutation.isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                忽略
              </button>
              <button
                onClick={() => setShowNote(!showNote)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors',
                  showNote ? 'text-blue-900 bg-blue-100' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {showNote ? '隐藏备注' : '添加备注'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
