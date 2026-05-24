
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ListTodo, 
  FileUp, 
  Skull, 
  Settings,
  RefreshCw
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: '财务看板', icon: LayoutDashboard },
  { path: '/queue', label: '队列列表', icon: ListTodo },
  { path: '/import', label: '回执导入', icon: FileUp },
  { path: '/dead-letter', label: '死信队列', icon: Skull },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-900 text-white">
          <div className="p-6">
            <h1 className="text-xl font-bold text-white">储值补偿队列</h1>
            <p className="text-sm text-slate-400 mt-1">会员储值重试补偿系统</p>
          </div>
          
          <nav className="mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    isActive 
                      ? 'bg-slate-800 text-white border-l-4 border-blue-500' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="bg-white border-b border-slate-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {navItems.find(n => location.pathname.startsWith(n.path))?.label || '系统'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-md hover:border-slate-300"
                >
                  <RefreshCw size={16} />
                  刷新数据
                </button>
              </div>
            </div>
          </header>
          
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
