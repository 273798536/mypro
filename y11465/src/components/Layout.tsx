import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  FileText,
  CheckSquare,
  ListTodo,
  FileBarChart,
  History,
  PlayCircle,
  LogOut
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/batches', label: '批次管理', icon: Layers },
  { path: '/documents', label: '单据管理', icon: FileText },
  { path: '/review', label: '复核改判', icon: CheckSquare },
  { path: '/tasks', label: '任务监控', icon: ListTodo },
  { path: '/reports', label: '报告中心', icon: FileBarChart },
  { path: '/audit', label: '审计追踪', icon: History },
  { path: '/demo', label: '演示流程', icon: PlayCircle },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-60 bg-slate-800 text-white flex flex-col shadow-xl">
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-lg font-bold tracking-wide">
            样衣异常回执系统
          </h1>
          <p className="text-xs text-slate-400 mt-1">Garment Sample State Machine</p>
        </div>
        
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-4 border-orange-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium">
              管
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">管理员</p>
              <p className="text-xs text-slate-400">admin@company.com</p>
            </div>
            <button className="text-slate-400 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
