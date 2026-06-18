import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Play, Search, BarChart3, User } from 'lucide-react';

const navItems = [
  { path: '/', label: '处理状态看板', icon: LayoutDashboard },
  { path: '/samples', label: '样本表管理', icon: FileText },
  { path: '/playback', label: '误判回放', icon: Play },
  { path: '/review', label: '评审分析', icon: BarChart3 },
];

function Layout() {
  const location = useLocation();
  
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-primary-800 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <h1 className="font-serif text-xl font-bold tracking-wide">
            商品属性误判回放
          </h1>
          <p className="text-primary-300 text-sm mt-1">证据链追踪系统</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-primary-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="font-medium text-sm">周姐</p>
              <p className="text-primary-300 text-xs">标注负责人</p>
            </div>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
