import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileQuestion, AlertTriangle, Database } from 'lucide-react';

const navItems = [
  { to: '/', label: '数据工作台', icon: LayoutDashboard },
  { to: '/test/reimport', label: '重复导入测试', icon: AlertTriangle },
];

export function TopNav() {
  return (
    <header className="h-12 border-b border-hall-border bg-hall-bg/80 backdrop-blur-sm flex items-center px-5 gap-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded border border-hall-accent/50 bg-hall-accent/10 flex items-center justify-center">
          <Database size={13} className="text-hall-accent" />
        </div>
        <div className="font-display font-semibold tracking-wide text-sm text-hall-text">音乐厅声线遮挡模型</div>
        <div className="text-[10px] text-hall-textMute px-1.5 py-0.5 border border-hall-border rounded">v0.1</div>
      </div>
      <nav className="flex items-center gap-1 ml-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                isActive
                  ? 'bg-hall-accent/15 text-hall-accent border border-hall-accent/30'
                  : 'text-hall-textDim hover:text-hall-text hover:bg-hall-bg3 border border-transparent'
              }`
            }
          >
            <item.icon size={13} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2 text-[11px] text-hall-textMute">
        <FileQuestion size={12} />
        导入即自动检测异常 · 结果持久化至本地
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-hall-bg text-hall-text">
      <TopNav />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
