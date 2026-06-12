import { Link } from 'react-router-dom';
import { TriangleAlert, Home, ArrowLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function Layout({ children, title, showBack }: LayoutProps) {
  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Link to="/" className="btn-ghost !p-2">
                <ArrowLeft size={18} />
              </Link>
            )}
            <TriangleAlert className="text-ink-800" size={22} />
            <div>
              <h1 className="font-display text-xl font-bold text-ink-900 leading-none">
                {title || '凸包面积错题复盘'}
              </h1>
              <p className="text-[11px] text-ink-600 mt-0.5 tracking-wide">
                Convex Hull Area · Post-mortem Review
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/" className="btn-ghost !py-1.5 !px-3 text-xs">
              <Home size={14} /> 复盘首页
            </Link>
            <Link to="/anomaly" className="btn-ghost !py-1.5 !px-3 text-xs text-amber-600">
              <TriangleAlert size={14} /> 异常隔离区
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      <footer className="border-t border-paper-200 mt-16 py-6 text-center text-xs text-ink-600">
        建模助教小岑 · 凸包面积错题复盘 · 评审会前沟通用
      </footer>
    </div>
  );
}
