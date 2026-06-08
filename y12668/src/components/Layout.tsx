import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Layers, Clock, Database, AlertTriangle } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';

export default function Layout() {
  const location = useLocation();
  const initIfEmpty = useProjectionStore((s) => s.initIfEmpty);
  const records = useProjectionStore((s) => s.records);
  const critical = records.filter((r) => r.anomalyType === 'camera_view_lost').length;

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  const navItems = [
    { to: '/detail-linkage', label: '明细联动', icon: Layers, hint: '日常入口' },
    { to: '/timeline', label: '时间回放', icon: Clock, hint: '月底 / 课前' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-panel-bg text-zinc-200">
      <header className="border-b border-panel-border bg-panel-surface">
        <div className="flex items-center h-14 px-5 gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 border border-amber-500 flex items-center justify-center">
              <Database className="w-4 h-4 text-amber-500" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-zinc-100 tracking-wide">大模型特征空间投影</div>
              <div className="text-[11px] text-zinc-500">Projection Review Console</div>
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-2 px-3.5 py-1.5 text-sm border transition-colors ${
                    active
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-panel-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500">/ {item.hint}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <AlertTriangle className={`w-3.5 h-3.5 ${critical > 0 ? 'text-rose-500' : 'text-zinc-600'}`} />
              <span>
                相机视角丢失 <span className={`font-mono ${critical > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{critical}</span> 条
              </span>
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              总记录 <span className="text-zinc-300">{records.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
