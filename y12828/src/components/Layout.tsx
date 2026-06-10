import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  AlertTriangle,
  Search,
  FileCheck,
  Upload,
  Bot,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useSampleStore } from '@/stores/sampleStore';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '差异分析', icon: LayoutDashboard, badge: 'pendingDiffs' },
  { path: '/lineage', label: '谱系追踪', icon: GitBranch },
  { path: '/duplicates', label: '重复处理', icon: AlertTriangle, badge: 'duplicateWarnings' },
  { path: '/trace', label: '倒查验证', icon: Search },
  { path: '/review', label: '复核管理', icon: FileCheck, badge: 'pendingReviews' },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/ai-station', label: 'AI工作台', icon: Bot },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { users, statistics } = useSampleStore();
  const currentUser = users[0];

  return (
    <div className="min-h-screen bg-gradient-lab flex">
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 flex flex-col bg-primary-600 text-white transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-primary-500/30">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center w-full')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <span className="font-bold text-lg">生</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-serif font-bold text-lg leading-tight">生物安全柜</h1>
                <p className="text-xs text-primary-200">使用记录系统</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:flex hidden p-1.5 hover:bg-primary-500/30 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badgeCount = item.badge ? statistics[item.badge as keyof typeof statistics] : 0;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                      isActive
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-primary-100 hover:bg-white/10 hover:text-white',
                      !sidebarOpen && 'justify-center px-2'
                    )}
                  >
                    <div className="relative">
                      <Icon size={20} className={cn(isActive && 'text-accent-300')} />
                      {item.badge && badgeCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 bg-warning-500 text-[10px] font-bold rounded-full animate-pulse-slow">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </div>
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-primary-500/30">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors',
                !sidebarOpen && 'justify-center'
              )}
            >
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-9 h-9 rounded-full border-2 border-primary-400/50"
              />
              {sidebarOpen && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-primary-200">
                    {currentUser?.role === 'technician' && '检验师'}
                    {currentUser?.role === 'quality_control' && '质控组'}
                    {currentUser?.role === 'admin' && '管理员'}
                  </p>
                </div>
              )}
              {sidebarOpen && <ChevronDown size={16} className="text-primary-300" />}
            </button>

            {userMenuOpen && sidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-lab-border overflow-hidden animate-fade-in">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-lab-text hover:bg-lab-bg transition-colors text-sm">
                  <User size={16} />
                  个人信息
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-danger-600 hover:bg-danger-50 transition-colors text-sm">
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-lab-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div>
            <h2 className="font-serif text-xl font-bold text-primary-600">
              {navItems.find((n) => n.path === location.pathname)?.label || '生物安全柜使用记录系统'}
            </h2>
            <p className="text-xs text-lab-textMuted">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-accent-500 absolute top-1 right-1 animate-pulse" />
              <div className="px-3 py-1.5 bg-accent-50 text-accent-700 rounded-lg text-xs font-medium">
                AI 工作流运行中
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
