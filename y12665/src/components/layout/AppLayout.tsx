import { Outlet, NavLink } from 'react-router-dom';
import { ListTodo, Download, RefreshCw, PanelLeft, PanelLeftClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/useUIStore';

export default function AppLayout() {
  const { sidebarCollapsed, toggleSidebar, setActiveTab } = useUIStore();

  const menuItems = [
    { key: 'exercises', label: '练习列表', icon: ListTodo, to: '/exercises' },
    { key: 'export', label: '数据导出', icon: Download, to: '/export' },
    { key: 'test', label: '重复导入测试', icon: RefreshCw, to: '/test/repeat-import' },
  ];

  return (
    <div className="flex h-screen flex-col bg-deep-space text-white">
      <header className="flex h-16 items-center justify-between border-b border-deep-space-700 bg-deep-space-900 px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-deep-space-100 transition-colors hover:bg-deep-space-700 hover:text-ice-blue"
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ice-blue to-deep-space-500">
              <span className="text-sm font-bold text-white">分</span>
            </div>
            <h1 className="text-lg font-semibold tracking-wide">分子构象旋转练习工作台</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-pass shadow-glow-ice" />
          <span className="text-sm text-deep-space-200">系统运行中</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'flex flex-col border-r border-deep-space-700 bg-deep-space-800 transition-all duration-300',
            sidebarCollapsed ? 'w-16' : 'w-60',
          )}
        >
          <nav className="flex-1 space-y-1 p-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={() => setActiveTab(item.key)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-ice-blue/20 text-ice-blue shadow-glow-ice ring-1 ring-ice-blue/30'
                        : 'text-deep-space-200 hover:bg-deep-space-700 hover:text-white',
                      sidebarCollapsed && 'justify-center px-0',
                    )
                  }
                >
                  <Icon size={20} strokeWidth={1.8} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto bg-deep-space-900/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
