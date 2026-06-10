import { Link, useLocation } from 'react-router-dom';
import {
  FlaskConical,
  Image,
  GitCompareArrows,
  UserCheck,
  FileText,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: '质控工作台', icon: FlaskConical },
  { path: '/diff-analysis', label: '差异分析', icon: GitCompareArrows },
  { path: '/supervisor', label: '导师视图', icon: UserCheck },
  { path: '/reports', label: '报告中心', icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex lg:flex-col lg:w-60 bg-white border-r border-slate-200 fixed inset-y-0 z-30">
        <div className="px-5 py-4 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-qc-teal rounded-lg flex items-center justify-center">
              <FlaskConical size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-slate-800 leading-tight">
                细胞计数质控台
              </h1>
              <p className="text-[10px] text-slate-400 font-body">QC Platform</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-qc-teal/8 text-qc-teal'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-qc-teal/10 flex items-center justify-center">
              <Image size={14} className="text-qc-teal" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700">生物实验室</p>
              <p className="text-[10px] text-slate-400">样本质控管理</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-60">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-qc-teal rounded-lg flex items-center justify-center">
              <FlaskConical size={14} className="text-white" />
            </div>
            <span className="text-sm font-display font-bold text-slate-800">细胞计数质控台</span>
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-10 bg-black/20" onClick={() => setMobileOpen(false)}>
            <nav className="bg-white w-56 h-full shadow-lg p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-qc-teal/8 text-qc-teal'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
