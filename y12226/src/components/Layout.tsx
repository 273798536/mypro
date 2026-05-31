import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import ConflictAlertBar from './ConflictAlertBar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': '首页',
  '/donations': '捐赠记录',
  '/budgets': '项目预算',
  '/receipts': '支出票据',
  '/lock': '用途锁定',
  '/report': '公开报告',
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || '慈善捐赠账务系统';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="ml-60 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <h1 className="text-xl font-semibold text-slate-800 font-noto-serif-sc">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-slate-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-teal-700" />
              </div>
              <span className="text-sm text-slate-700">管理员</span>
            </div>
          </div>
        </header>
        <main className="p-6">
          <ConflictAlertBar />
          <div className={cn('animate-fade-in')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
