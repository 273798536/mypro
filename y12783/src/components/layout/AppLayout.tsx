import { NavLink, useLocation } from 'react-router-dom';
import { FlaskConical, Layers, FileBarChart, Terminal, Home } from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '批次追踪', icon: Home, exact: true },
  { path: '/reagents', label: '试剂台账', icon: FlaskConical },
  { path: '/spectrum', label: '谱图判读', icon: FileBarChart },
  { path: '/cli-help', label: 'CLI 指南', icon: Terminal },
];

export function AppLayout({ children }: SidebarProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-800">
          <Layers className="w-6 h-6 mr-2 text-sky-400" />
          <span className="font-semibold text-lg tracking-wide">薄膜镀层估算</span>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            <p>实验室管理系统 v1.0</p>
            <p className="mt-1">厚度估算 · 批次追踪</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6">
          <h1 className="text-base font-medium text-slate-700">
            {navItems.find(
              (item) =>
                (item.exact && location.pathname === item.path) ||
                (!item.exact && location.pathname.startsWith(item.path))
            )?.label || '薄膜镀层厚度估算'}
          </h1>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
