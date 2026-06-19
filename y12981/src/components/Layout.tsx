import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  BookOpen, 
  Shield, 
  TestTube,
  User,
  Bell
} from 'lucide-react';

const Layout: React.FC = () => {
  const navItems = [
    { path: '/', label: '诊断看板', icon: LayoutDashboard },
    { path: '/audit', label: '审计历史', icon: History },
    { path: '/dictionary', label: '数据字典', icon: BookOpen },
    { path: '/permissions', label: '权限管理', icon: Shield },
    { path: '/boundary', label: '边界案例', icon: TestTube },
  ];

  return (
    <div className="min-h-screen bg-navy-900 text-navy-100 flex">
      <aside className="w-64 bg-navy-800 border-r border-navy-700 flex flex-col">
        <div className="p-6 border-b border-navy-700">
          <h1 className="text-xl font-mono font-bold text-white tracking-wider">
            连接池诊断
          </h1>
          <p className="text-xs text-navy-400 mt-1">Database Pool Diagnostics</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-navy-300 hover:bg-navy-700 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-700">
          <div className="flex items-center gap-3 px-4 py-3 bg-navy-700/50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">李华</p>
              <p className="text-xs text-navy-400 truncate">SRE 复核</p>
            </div>
            <Bell size={16} className="text-navy-400 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-navy-800/50 border-b border-navy-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              {navItems.find(n => n.path === location.pathname)?.label || '诊断看板'}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-navy-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            系统运行正常
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
