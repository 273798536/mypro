import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, GitBranch, ListTodo, Zap } from 'lucide-react';
import ViewSwitcher from '@/components/ViewSwitcher';
import ExportButton from '@/components/ExportButton';
import SceneTag from '@/components/SceneTag';
import { useAppStore } from '@/store/useAppStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '总览看板' },
  { path: '/analysis', icon: GitBranch, label: '归因分析' },
  { path: '/queue', icon: ListTodo, label: '异常队列' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const viewMode = useAppStore((s) => s.viewMode);
  const currentScene = useAppStore((s) => s.currentScene);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* 侧边导航 */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            {!collapsed && (
              <span className="font-mono font-bold text-sm tracking-wide">
                SPECKLE
              </span>
            )}
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 收起按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 border-t border-slate-800 text-slate-500 hover:text-slate-300 text-xs flex items-center justify-center"
        >
          {collapsed ? '→' : '← 收起'}
        </button>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-14 flex-shrink-0 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-medium text-slate-200">
              激光散斑误差归因
            </h1>
            <SceneTag title={currentScene.title} />
          </div>
          <div className="flex items-center gap-3">
            <ViewSwitcher mode={viewMode} />
            <ExportButton />
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
