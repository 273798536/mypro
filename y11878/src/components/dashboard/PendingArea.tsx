import { AlertTriangle, Check, X } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import type { PendingItem } from '@/types';

function getTypeIcon(type: PendingItem['type']) {
  switch (type) {
    case 'isolated':
      return <AlertTriangle className="w-5 h-5 text-accent-red" />;
    case 'zeroCapacity':
      return <AlertTriangle className="w-5 h-5 text-accent-amber" />;
    case 'disabledNotEffective':
      return <AlertTriangle className="w-5 h-5 text-accent-orange" />;
  }
}

function getTypeLabel(type: PendingItem['type']) {
  switch (type) {
    case 'isolated':
      return '孤立节点';
    case 'zeroCapacity':
      return '零容量';
    case 'disabledNotEffective':
      return '禁用未生效';
  }
}

export default function PendingArea() {
  const { pendingItems, resolvePendingItem, dismissPendingItem } = useNetworkStore();

  const unresolvedItems = pendingItems.filter((item) => !item.resolved);

  if (unresolvedItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-accent-amber" />
        <h2 className="text-sm font-medium text-white">
          待确认 ({unresolvedItems.length})
        </h2>
      </div>
      <div className="space-y-2">
        {unresolvedItems.map((item) => (
          <div
            key={item.id}
            className="pending-card flex items-start justify-between"
          >
            <div className="flex items-start gap-3">
              {getTypeIcon(item.type)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-accent-amber font-medium">
                    {getTypeLabel(item.type)}
                  </span>
                  <span className="text-white font-mono text-sm">
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-base-500 mt-1">{item.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resolvePendingItem(item.id)}
                className="p-1.5 hover:bg-accent-cyan/20 border border-accent-cyan/30"
                title="确认已处理"
              >
                <Check className="w-4 h-4 text-accent-cyan" />
              </button>
              <button
                onClick={() => dismissPendingItem(item.id)}
                className="p-1.5 hover:bg-base-700 border border-base-600"
                title="忽略"
              >
                <X className="w-4 h-4 text-base-500" />
              </button>
            </div>
          </div>
          ))}
      </div>
    </div>
  );
}
