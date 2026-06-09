import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, title, showBack, backTo = "/", backLabel = "返回列表", actions }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBack && (
              <Link
                to={backTo}
                className="inline-flex items-center gap-1.5 text-sm text-lab-blue hover:text-lab-blue-light transition-colors"
              >
                <ArrowLeft width={16} height={16} />
                {backLabel}
              </Link>
            )}
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="font-serif text-xl font-bold text-lab-ink tracking-wide">
              薄层色谱展开复盘
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {title && <span className="text-sm text-slate-500 font-serif">{title}</span>}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-slate-400 no-print">
        薄层色谱实验复盘系统 · 仅供实验室内部使用
      </footer>
    </div>
  );
}
