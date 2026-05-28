import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckSquare, Square, Check, X } from 'lucide-react';
import { PendingGroup } from '../components/PendingGroup';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { pendingService } from '../services';
import type { PendingItem, PendingType, ApiResponse } from 'shared/types';

export default function PendingArea() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const previousItemIds = useRef<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<ApiResponse<PendingItem[]>>({
    queryKey: ['pendingItems'],
    queryFn: () => pendingService.getItems('pending'),
    refetchInterval: 15000,
  });

  const items: PendingItem[] = Array.isArray(data?.data) ? data.data : [];

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.id));
    const newIds = new Set([...currentIds].filter((id) => !previousItemIds.current.has(id)));
    if (newIds.size > 0) {
      setNewItemIds(newIds);
      setTimeout(() => setNewItemIds(new Set()), 6000);
    }
    previousItemIds.current = currentIds;
  }, [items]);

  const groupedItems: Record<PendingType, PendingItem[]> = {
    residual_expired: [],
    contract_replaced: [],
    subsidy_clawback: [],
  };

  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (item?.type && groupedItems[item.type]) {
        groupedItems[item.type].push(item);
      }
    });
  }

  const allIds = items.map((item) => item.id);
  const allSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(allSelected ? [] : allIds);
  };

  const batchConfirmMutation = useMutation({
    mutationFn: (ids: string[]) => pendingService.batchConfirm(ids, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
      setSelectedIds([]);
    },
  });

  const batchIgnoreMutation = useMutation({
    mutationFn: (ids: string[]) => pendingService.batchIgnore(ids, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
      setSelectedIds([]);
    },
  });

  const pendingTypes: PendingType[] = ['residual_expired', 'contract_replaced', 'subsidy_clawback'];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-7 w-7" />
            <div>
              <h1 className="text-xl font-bold">待确认区</h1>
              <p className="text-blue-200 text-sm">处理残值过期、合同换车、补贴追回等待办事项</p>
            </div>
          </div>
          {items.length > 0 && (
            <span className="px-3 py-1 bg-red-500 rounded-full text-sm font-bold">
              {items.length} 项待处理
            </span>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-slate-700 hover:text-blue-900"
            >
              {allSelected ? (
                <CheckSquare className="h-5 w-5 text-blue-900" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                {allSelected ? '取消全选' : '全选'} ({selectedIds.length}/{allIds.length})
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => batchConfirmMutation.mutate(selectedIds)}
              disabled={batchConfirmMutation.isPending}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              批量确认
            </button>
            <button
              onClick={() => batchIgnoreMutation.mutate(selectedIds)}
              disabled={batchIgnoreMutation.isPending}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              批量忽略
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-slate-600">正在加载待办事项...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 font-medium">加载失败</p>
            <p className="text-slate-500 text-sm mt-1">请稍后重试</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {pendingTypes.map((type, index) => (
              <div
                key={type}
                className="opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PendingGroup
                  type={type}
                  items={groupedItems[type]}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  newItemIds={newItemIds}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </div>
  );
}
