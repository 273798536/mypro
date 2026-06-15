import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Music3,
  FolderOpen,
  AlertTriangle,
  Download,
  Music2,
} from 'lucide-react';
import { useReviewStore } from '../store/reviewStore';
import DetailDrawer from './DetailDrawer';

const navItems = [
  { to: '/', icon: Home, label: '复核总览', key: 'dashboard' },
  { to: '/review', icon: Music3, label: '声部复核', key: 'review' },
  { to: '/files', icon: FolderOpen, label: '音频文件夹', key: 'files' },
  { to: '/confirm', icon: AlertTriangle, label: '异常确认中心', key: 'confirm' },
  { to: '/export', icon: Download, label: '交接导出', key: 'export' },
];

export default function AppLayout() {
  const location = useLocation();
  const init = useReviewStore((s) => s.init);
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const setActiveBatch = useReviewStore((s) => s.setActiveBatch);
  const drawerOpen = useReviewStore((s) => s.drawerOpen);

  if (batches.length === 0) {
    init();
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-noteBounce inline-block">🎵</div>
          <p className="text-ink-500 mt-2 font-serif">正在加载合唱声部版本复核系统…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 侧边导航 */}
      <aside className="w-60 shrink-0 bg-gradient-to-b from-forest-500 to-forest-700 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-2xl backdrop-blur-sm">
              🎼
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold leading-tight">声部复核</h1>
              <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                Choir Review Studio
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.key}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-white/15 shadow-inner text-white'
                    : 'text-white/75 hover:bg-white/8 hover:text-white hover:translate-x-0.5'
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}
                />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* 批次切换器 */}
        <div className="px-3 pb-5 border-t border-white/10 pt-4">
          <p className="text-[11px] text-white/50 uppercase tracking-wider px-3 mb-2">
            当前复核批次
          </p>
          <div className="space-y-1">
            {batches.slice(0, 3).map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBatch(b.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                  activeBatchId === b.id
                    ? 'bg-copper-500/90 text-white shadow-md'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="font-medium truncate">{b.name}</div>
                <div className="text-[10px] opacity-75 mt-0.5 truncate">{b.folderPath}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white/60 backdrop-blur-md border-b border-ink-100 flex items-center px-8 justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Music2 className="text-forest-500" size={22} />
            <h2 className="font-serif text-lg font-bold text-ink-900">
              {batches.find((b) => b.id === activeBatchId)?.name ?? '合唱声部版本复核'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-500">
              统筹 · 演出协调 ·{' '}
              <span className="font-medium text-ink-700">阿蓝</span>
            </span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-copper-300 to-copper-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
              蓝
            </div>
          </div>
        </header>

        <div className={`flex-1 ${drawerOpen ? 'mr-[380px]' : ''} transition-all duration-300`}>
          <div className="p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* 右侧详情抽屉 */}
      <DetailDrawer />

      {/* 装饰元素 */}
      <div className="staff-decoration top-0 left-0 w-32 h-64" />
      <div
        className="staff-decoration bottom-0 right-0 w-32 h-64"
        style={{ transform: 'rotate(180deg)' }}
      />
    </div>
  );
}
