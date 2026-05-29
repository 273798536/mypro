import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Settings, BarChart3, Layers, Zap } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-accent-info)] to-[var(--color-accent-warning)] flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-info)] transition-colors">
                期权波动塔防
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">Volatility Tower Defense</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/'
                  ? 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">首页</span>
            </Link>
            <Link
              to="/lobby"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/lobby')
                  ? 'bg-[var(--color-accent-info)]/20 text-[var(--color-accent-info)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">游戏大厅</span>
            </Link>
            <Link
              to="/admin/compare-results"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/admin/compare-results')
                  ? 'bg-[var(--color-accent-warning)]/20 text-[var(--color-accent-warning)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">结果对比</span>
            </Link>
            <div className="w-px h-6 bg-[var(--color-border)] mx-2" />
            <Link
              to="/admin/option-cards"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/admin/option-cards')
                  ? 'bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">期权卡</span>
            </Link>
            <Link
              to="/admin/volatility-events"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/admin/volatility-events')
                  ? 'bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">波动事件</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-[var(--color-text-muted)]">
          <p>期权波动塔防 · 投教游戏 · 让波动率不再抽象</p>
        </div>
      </footer>
    </div>
  );
}
