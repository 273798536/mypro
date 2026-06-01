import React, { useState, useEffect } from 'react';
import { Bell, Settings, Search, RefreshCw } from 'lucide-react';
import { useExceptionStore } from '../../engines/ExceptionEngine';
import { useFilterStore } from '../../engines/FilterSyncEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const Header: React.FC = () => {
  const pendingCount = useExceptionStore((state) =>
    state.exceptions.filter((e) => e.status === 'pending').length
  );
  const dateRangeStart = useFilterStore((s) => s.dateRange[0]);
  const dateRangeEnd = useFilterStore((s) => s.dateRange[1]);
  const keyword = useFilterStore((s) => s.keyword);
  const setKeyword = useFilterStore((s) => s.setKeyword);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-sm text-neutral-500">
          <span className="text-neutral-700 font-medium">
            {format(dateRangeStart, 'yyyy年MM月dd日', { locale: zhCN })}
          </span>
          <span className="mx-2">至</span>
          <span className="text-neutral-700 font-medium">
            {format(dateRangeEnd, 'yyyy年MM月dd日', { locale: zhCN })}
          </span>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索姓名、身份证号、预约号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input-base pl-9 w-72 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-neutral-600 font-mono">
          {format(currentTime, 'yyyy-MM-dd HH:mm:ss')}
        </div>

        <button
          onClick={handleRefresh}
          className="p-2 rounded-md hover:bg-neutral-100 transition-colors"
          title="刷新数据"
        >
          <RefreshCw
            size={18}
            className={`text-neutral-500 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>

        <button className="relative p-2 rounded-md hover:bg-neutral-100 transition-colors">
          <Bell size={18} className="text-neutral-500" />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center animate-breathe">
              {pendingCount}
            </span>
          )}
        </button>

        <button className="p-2 rounded-md hover:bg-neutral-100 transition-colors">
          <Settings size={18} className="text-neutral-500" />
        </button>
      </div>
    </header>
  );
};

export default Header;
