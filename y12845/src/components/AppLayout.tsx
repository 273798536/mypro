import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FlaskConical, FileSpreadsheet, TestTube, GitBranch, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { to: '/', label: '实验总览', icon: LayoutDashboard },
    { to: '/batch/batch-001', label: '批次复核', icon: FlaskConical },
    { to: '/samples', label: '样本清单', icon: FileSpreadsheet },
    { to: '/lineage/batch-001', label: '谱系追踪', icon: GitBranch },
    { to: '/test-path', label: '测试路径', icon: TestTube },
  ];

  return (
    <div className="min-h-screen bg-ivory-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-abyss-800 text-white transition-all duration-300 ease-in-out flex flex-col flex-shrink-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-abyss-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-ember-400" />
              <span className="font-serif-cn text-lg font-semibold">抗生素梯度</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-abyss-700 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-ember-500 text-white shadow-ember-glow'
                    : 'text-abyss-200 hover:bg-abyss-700 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-abyss-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-abyss-600 flex items-center justify-center text-sm font-medium">
                管
              </div>
              <div>
                <div className="text-sm font-medium">张管理员</div>
                <div className="text-xs text-abyss-400">动物房</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-abyss-100/80 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="text-lg font-serif-cn font-semibold text-abyss-800">
              抗生素梯度实验复核系统
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-abyss-500">
              当前角色：动物房管理员
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
