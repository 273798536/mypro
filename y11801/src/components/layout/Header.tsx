import { Bell, User, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

const pageTitles: Record<string, string> = {
  '/': '残值试算',
  '/pending': '待确认区',
  '/import': '数据导入',
  '/export': '报告导出',
};

export const Header = () => {
  const location = useLocation();
  const { pendingCount, currentUser } = useAppStore();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/detail/')) {
      return '试算详情';
    }
    return pageTitles[path] || '残值试算系统';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-slate-800">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-medium rounded-full flex items-center justify-center animate-pulse">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>

        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700">
              {currentUser.name}
            </p>
            <p className="text-xs text-slate-500">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
