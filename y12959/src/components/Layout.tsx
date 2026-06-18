import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  History,
  Download,
  Database,
  Shield,
  ChevronLeft,
  ChevronRight,
  User,
  Sun,
  Moon,
  LogOut,
  Receipt,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { users } from '@/mock/data';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface LayoutProps {
  children: React.ReactNode;
  showExplanationPanel?: boolean;
  explanationPanel?: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: '冲突总览', Icon: LayoutDashboard, badge: null },
  { path: '/conflicts', label: '冲突列表', Icon: AlertTriangle, badge: null },
  { path: '/history', label: '操作历史', Icon: History, badge: null },
  { path: '/downloads', label: '下载中心', Icon: Download, badge: null },
];

const breadcrumbMap: Record<string, string> = {
  '/dashboard': '冲突总览',
  '/conflicts': '冲突列表',
  '/history': '操作历史',
  '/downloads': '下载中心',
};

export default function Layout({
  children,
  showExplanationPanel = true,
  explanationPanel,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, setUser } = useAppStore();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const buildBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let acc = '';
    for (const p of parts) {
      acc += '/' + p;
      const label = breadcrumbMap[acc];
      if (label) crumbs.push({ label, path: acc });
      else if (p !== acc.slice(1).split('/').pop()) {
        // param parts (like :id) just add last fragment as raw
        crumbs.push({ label: `#${p.slice(0, 12)}${p.length > 12 ? '...' : ''}`, path: acc });
      } else {
        crumbs.push({ label: p, path: acc });
      }
    }
    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-audit-50/40">
      <aside
        className={cn(
          'flex h-full flex-col border-r border-audit-200 bg-white transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-audit-100 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-audit-700 text-white shadow-sm">
            <Receipt className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate font-serif text-sm font-bold text-audit-800">
                订单幂等冲突工作台
              </div>
              <div className="truncate text-[10px] uppercase tracking-wider text-audit-400">
                Idempotent Conflict Report
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto py-3 px-2 scrollbar-thin">
          {navItems.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2' : '',
                  isActive
                    ? 'bg-audit-700 text-white shadow-sm'
                    : 'text-audit-600 hover:bg-audit-50 hover:text-audit-800'
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', collapsed ? 'h-5 w-5' : '')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="border-t border-audit-100 p-3">
            <div className="mb-2 rounded-md bg-audit-50 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-audit-400">
                  当前角色
                </span>
                <Shield className="h-3 w-3 text-audit-400" />
              </div>
              <div className="text-xs font-medium text-audit-700">
                {currentUser.effectivePermissions.length} 项有效权限
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {currentUser.effectivePermissions.slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="rounded bg-white px-1.5 py-0.5 text-[10px] text-audit-600 border border-audit-100"
                  >
                    {p.split(':')[0]}
                  </span>
                ))}
                {currentUser.effectivePermissions.length > 3 && (
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-audit-400 border border-audit-100">
                    +{currentUser.effectivePermissions.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-10 items-center justify-center border-t border-audit-100 text-audit-400 transition-colors hover:bg-audit-50 hover:text-audit-700"
          title={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-audit-200 bg-white px-6">
          <div className="flex min-w-0 items-center gap-2 text-sm text-audit-500">
            <Database className="h-4 w-4 text-audit-400 shrink-0" />
            {breadcrumbs.length > 0 && (
              <div className="flex min-w-0 items-center gap-1.5 truncate">
                {breadcrumbs.map((b, i) => (
                  <span key={b.path + i} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <span className="text-audit-300">/</span>}
                    <span
                      className={cn(
                        'truncate',
                        i === breadcrumbs.length - 1
                          ? 'font-semibold text-audit-800'
                          : 'text-audit-500'
                      )}
                    >
                      {b.label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md text-audit-500 transition-colors hover:bg-audit-50 hover:text-audit-800"
              title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-audit-200 bg-white px-2.5 py-1.5 text-sm transition-colors hover:bg-audit-50"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-audit-100 text-audit-600">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="max-w-[140px] truncate text-sm font-medium text-audit-700">
                  {currentUser.displayName}
                </span>
              </button>
              <div className="invisible absolute right-0 top-full z-50 mt-1.5 w-64 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
                <div className="overflow-hidden rounded-lg border border-audit-200 bg-white shadow-card">
                  <div className="border-b border-audit-100 bg-audit-50/50 px-4 py-3">
                    <div className="text-sm font-semibold text-audit-800">
                      {currentUser.displayName}
                    </div>
                    <div className="text-xs text-audit-500">@{currentUser.username}</div>
                  </div>
                  <div className="py-1.5">
                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-audit-400">
                      切换身份（模拟）
                    </div>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUser(u)}
                        className={cn(
                          'flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                          u.id === currentUser.id
                            ? 'bg-audit-700 text-white'
                            : 'text-audit-700 hover:bg-audit-50'
                        )}
                      >
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{u.displayName}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-audit-100 py-1.5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-audit-500 transition-colors hover:bg-audit-50 hover:text-danger-600"
                    >
                      <LogOut className="h-3.5 w-3.5 shrink-0" />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              'min-w-0 flex-1 overflow-auto',
              showExplanationPanel && explanationPanel ? 'pr-0' : ''
            )}
          >
            <div className="min-h-full p-6 animate-fade-in-up">{children}</div>
          </div>

          {showExplanationPanel && explanationPanel && (
            <div className="hidden shrink-0 border-l border-audit-200 bg-white/60 p-4 xl:block xl:w-[380px]">
              {explanationPanel}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
