import { NavLink, Link } from 'react-router-dom';
import { Footprints, ListChecks, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent text-white">
              <Footprints className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold tracking-tight">
                慢行桥坡道公示清单
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted">
                RAMP DISCLOSURE · 可追溯
              </span>
            </span>
          </Link>

          <nav className="ml-4 flex items-center gap-1">
            <NavItem to="/" icon={<ListChecks className="h-4 w-4" />} label="公示清单" />
            <NavItem to="/map" icon={<MapIcon className="h-4 w-4" />} label="地图总览" />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[11px] text-muted sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-status-processed" />
              社区运营 · 阿宁
            </span>
            <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-[10px] font-semibold text-accent">
              v0.1
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-6">{children}</main>

      <footer className="mx-auto max-w-[1280px] px-5 pb-10 pt-4">
        <div className="border-t border-line pt-4 font-mono text-[11px] text-muted">
          每一次改判都记录来源 · 前后状态 · 影响哪些判断 · CSV 按 已处理 / 待补材料 /
          人工改判 分类
        </div>
      </footer>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent text-white'
            : 'text-muted hover:bg-paper hover:text-ink',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
