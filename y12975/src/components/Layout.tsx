import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Shield,
  Clock,
  Undo2,
  Camera,
  FileText,
  FlaskConical,
  Download,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '总览', icon: LayoutDashboard },
  { path: '/drift', label: '漂移列表', icon: Search },
  { path: '/audit', label: '权限审计', icon: Shield },
  { path: '/slow-query', label: '慢查询归因', icon: Clock },
  { path: '/rollback', label: '回滚记录', icon: Undo2 },
  { path: '/snapshot', label: '表结构快照', icon: Camera },
  { path: '/history', label: '历史记录', icon: FileText },
  { path: '/tests', label: '测试场景', icon: FlaskConical },
  { path: '/download', label: '下载中心', icon: Download },
];

export default function Layout() {
  const [expanded, setExpanded] = useState(window.innerWidth >= 768);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setExpanded(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-bg text-txt">
      <aside
        className={`flex flex-col border-r border-border bg-bg-surface transition-all duration-200 shrink-0 ${
          expanded ? 'w-[220px]' : 'w-14'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center h-12 border-b border-border text-txt-muted hover:text-txt transition-colors"
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 h-10 text-sm transition-colors ${
                isActive(item.path)
                  ? 'text-signal-lime bg-signal-lime/5'
                  : 'text-txt-muted hover:text-txt hover:bg-bg-hover'
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <header className="flex items-center justify-between h-12 px-6 border-b border-border bg-bg-surface shrink-0">
          <h1 className="font-serif italic text-lg">字段枚举值漂移检查</h1>
          <span className="badge-muted px-2 py-0.5 rounded text-xs">本地工作台</span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
