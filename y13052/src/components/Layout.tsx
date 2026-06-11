import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ListOrdered, History, Wind, Share2, type LucideIcon } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('分享链接已复制（包含当前筛选与定位）');
    } catch {
      alert(window.location.href);
    }
  };

  const navItem = (to: string, label: string, Icon: LucideIcon) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-2 rounded-sm transition-all ${
          isActive
            ? 'bg-marine-700 text-white border-marine-700 shadow-engineering'
            : 'border-transparent text-slate-600 hover:text-marine-700 hover:bg-marine-50'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-marine-700 text-white rounded-sm flex items-center justify-center shadow-engineering">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-mono text-base font-bold text-marine-800 tracking-tight">
                滨海步道风场碰撞预审
              </h1>
              <p className="text-xs text-slate-500 font-mono">COASTAL-WIND-PRE-REVIEW · v1.0</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItem('/cases', '预审列表', ListOrdered)}
            {navItem('/history', '操作历史', History)}
            <button
              onClick={copyShareUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border-2 border-transparent rounded-sm hover:text-marine-700 hover:bg-marine-50 transition-all"
              title="复制当前页面链接，可还原筛选与定位"
            >
              <Share2 className="w-4 h-4" />
              复制链接
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>数据真实写回后端 · 最后路径 {location.pathname}</span>
          <span>© 运维复核工作台</span>
        </div>
      </footer>
    </div>
  );
}
