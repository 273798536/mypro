import React from 'react';
import { RefreshCw, Bell, Search, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';

export const Header: React.FC = () => {
  const lastRefreshTime = useAppStore((state) => state.lastRefreshTime);
  const refreshData = useAppStore((state) => state.refreshData);
  const loading = useAppStore((state) => state.loading);
  const [refreshResult, setRefreshResult] = React.useState<{
    added: number;
    updated: number;
    unchanged: number;
  } | null>(null);

  const handleRefresh = async () => {
    try {
      const result = await refreshData();
      setRefreshResult(result);
      setTimeout(() => setRefreshResult(null), 5000);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索会员号、姓名..."
            className="input pl-10 w-80"
          />
        </div>
        {refreshResult && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-sm animate-fade-in">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            刷新完成：新增{refreshResult.added}条，更新{refreshResult.updated}条，无数据丢失
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {lastRefreshTime && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4" />
            <span>上次刷新: {lastRefreshTime}</span>
          </div>
        )}
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn-secondary gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin-slow')} />
          刷新数据
        </button>

        <button className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
};
