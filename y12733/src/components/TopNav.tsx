import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Table2, BarChart3, RotateCcw, Database } from 'lucide-react';
import { useCondProbStore } from '@/store/useCondProbStore';

const NAV_ITEMS = [
  { to: '/', label: '结果解释', icon: BookOpen, desc: '日常入口' },
  { to: '/params', label: '参数表管理', icon: Table2, desc: '整理与修正' },
  { to: '/analysis', label: '误差分析', icon: BarChart3, desc: '月底/课前' },
];

export default function TopNav() {
  const { params, resetToSample } = useCondProbStore();
  const location = useLocation();

  const counts = {
    available: params.filter((p) => p.status === 'available').length,
    pending: params.filter((p) => p.status === 'pending').length,
    recollect: params.filter((p) => p.status === 'recollect').length,
  };

  return (
    <header className="sticky top-0 z-30 bg-ink-700 text-white border-b border-ink-900/40 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ink-400 to-ink-600 flex items-center justify-center border border-white/10 shadow-inner">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold leading-tight">条件概率教学卡</h1>
            <p className="text-[11px] text-ink-200/80 leading-tight tracking-wide">Conditional Probability Teaching Deck</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 ml-4">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                  active ? 'bg-white/10 text-white' : 'text-ink-100/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
                <span className="text-[10px] text-ink-200/50 ml-0.5 hidden md:inline">· {item.desc}</span>
                {active && (
                  <span className="absolute left-4 right-4 -bottom-[17px] h-0.5 bg-amber-400 rounded-t" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-ink-100/70">可用</span>
              <span className="font-mono text-white/90">{counts.available}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-ink-100/70">暂缓</span>
              <span className="font-mono text-white/90">{counts.pending}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-ink-100/70">重采</span>
              <span className="font-mono text-white/90">{counts.recollect}</span>
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm('确定重置为示例数据吗？当前数据将被覆盖。')) resetToSample();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-white/10 hover:bg-white/20 border border-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置示例
          </button>
        </div>
      </div>
    </header>
  );
}
