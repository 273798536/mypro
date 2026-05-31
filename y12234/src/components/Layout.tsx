import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Upload,
  Calculator,
  GitBranch,
  Link as LinkIcon,
  TestTube,
  Menu,
  X,
  Database,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';

const menuItems = [
  { path: '/', icon: Home, label: '工作台' },
  { path: '/import', icon: Upload, label: '数据导入' },
  { path: '/calculation', icon: Calculator, label: '收入递延计算' },
  { path: '/tracking', icon: GitBranch, label: '事件追踪中心' },
  { path: '/chain-trace', icon: LinkIcon, label: '链路追踪' },
  { path: '/bind-test', icon: TestTube, label: '车牌换绑测试' }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isDataLoaded, activeScenario, problems } = useAppStore();
  
  const unresolvedProblems = problems.filter(p => !p.isResolved).length;

  return (
    <div className="flex h-screen bg-slate-50">
      <aside 
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col shadow-xl`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-emerald-400" />
              <span className="font-bold text-lg tracking-wide">停车财务追踪</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                {!collapsed && item.label === '事件追踪中心' && unresolvedProblems > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {unresolvedProblems}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-4 border-t border-slate-700">
            <div className={`text-sm ${isDataLoaded ? 'text-emerald-400' : 'text-amber-400'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${isDataLoaded ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {isDataLoaded ? '数据已加载' : '未加载数据'}
              </div>
              {activeScenario && (
                <div className="text-slate-400 text-xs mt-1">
                  当前场景: {activeScenario}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-800">
              {menuItems.find(m => m.path === location.pathname)?.label || '系统'}
            </h1>
            <div className="flex items-center gap-4">
              {!isDataLoaded && (
                <Link
                  to="/import"
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  请先导入数据
                </Link>
              )}
              <div className="text-sm text-slate-500">
                {new Date().toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
