import { Calendar, Database, FolderOpen, ChevronRight, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: Calendar, label: '日历' },
  { path: '/data', icon: Database, label: '数据' },
  { path: '/scenarios', icon: FolderOpen, label: '方案' }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } bg-brand-primary text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          {sidebarOpen && (
            <span className="font-semibold text-lg truncate">现金流日历</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                location.pathname === path
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {sidebarOpen && <span className="text-sm">{label}</span>}
              {sidebarOpen && location.pathname === path && (
                <ChevronRight size={14} className="ml-auto" />
              )}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}