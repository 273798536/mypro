import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  Search,
  AlertTriangle,
  ClipboardCheck,
  Boxes,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '工作台' },
  { to: '/analysis', icon: Search, label: '分析页' },
  { to: '/anomaly', icon: AlertTriangle, label: '异常追踪' },
  { to: '/review', icon: ClipboardCheck, label: '复核单页' },
];

export default function AppLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex bg-ink-50">
      <aside className="w-60 shrink-0 border-r border-ink-200 bg-white flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-ink-200">
          <div className="w-10 h-10 rounded-[2px] bg-ink-700 text-white flex items-center justify-center shadow-sm">
            <Boxes size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-song text-base text-ink-800 leading-tight">整数规划</div>
            <div className="font-song text-[11px] text-ink-500 tracking-widest">错题复盘系统</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-[2px] text-sm transition-colors ${
                  isActive
                    ? 'bg-ink-700 text-white shadow-sm'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-800'
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span className="font-hei">{label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 pb-2 px-3 text-[10px] text-ink-400 tracking-widest font-hei">
            工具
          </div>
          <div className="space-y-0.5">
            <ParamShortcut />
          </div>
        </nav>

        <div className="border-t border-ink-200 p-4 text-[11px] text-ink-500 leading-relaxed">
          <div className="flex items-center gap-2 mb-1 text-ink-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-hei">教研编辑 · 阿宁</span>
          </div>
          <div className="text-ink-400">
            下次看到权重被改，记得先补备注再复核。
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 shrink-0 border-b border-ink-200 bg-white/60 backdrop-blur flex items-center justify-between px-6">
          <Breadcrumb pathname={pathname} />
          <div className="text-[11px] text-ink-500 font-hei tracking-wide">
            版本 · 2026-06-13 工作快照
          </div>
        </div>
        <div className="flex-1 overflow-auto scroll-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function ParamShortcut() {
  const params = useAppStoreShallow((s) => s.parameters);
  const highlight = useAppStoreShallow((s) => s.highlightedParamId);
  const setHighlight = useAppStoreShallow((s) => s.highlightParam);

  return (
    <div className="space-y-0.5">
      {params.map((p) => (
        <NavLink
          key={p.id}
          to={`/history/${p.id}`}
          onMouseEnter={() => setHighlight(p.id)}
          onMouseLeave={() => setHighlight(null)}
          className={`flex items-center justify-between px-3 py-1.5 rounded-[2px] text-xs transition-colors ${
            highlight === p.id
              ? 'bg-amber-100 text-ink-800'
              : 'text-ink-500 hover:bg-ink-100 hover:text-ink-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <History size={13} strokeWidth={1.8} />
            <span className="truncate max-w-[130px]">{p.name}</span>
          </span>
          {p.changeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-[2px] font-mono">
              {p.changeCount}次
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const map: Record<string, string> = {
    '/': '工作台',
    '/analysis': '分析页',
    '/anomaly': '异常追踪',
    '/review': '复核单页',
  };
  const label =
    map[pathname] ??
    (pathname.startsWith('/history/') ? '参数历史面板' : '页面');
  return (
    <div className="flex items-center gap-2 text-xs text-ink-500 font-hei">
      <span>整数规划错题复盘</span>
      <span className="text-ink-300">/</span>
      <span className="text-ink-800">{label}</span>
    </div>
  );
}

import { useAppStoreShallow } from '@/store/useAppStoreShallow';
