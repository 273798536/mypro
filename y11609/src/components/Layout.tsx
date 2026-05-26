import { Link, useLocation } from 'react-router-dom';
import { FileText, ListTodo, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/claims', label: '理赔单列表', icon: ListTodo },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg">理赔复核</h1>
              <p className="text-xs text-slate-400">免赔额计算工具</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs">
              客
            </div>
            <div>
              <p className="font-medium">当前客服</p>
              <p className="text-xs text-slate-400">理赔复核岗</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {navItems.find((item) => isActive(item.path))?.label || '系统'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/claims"
                className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1"
              >
                <FileText size={14} />
                返回列表
              </Link>
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
