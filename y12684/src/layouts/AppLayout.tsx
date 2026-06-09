import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';

const navItems = [
  { to: '/demo', label: '三维演示', icon: '🏜', description: '沙丘体素风蚀模拟' },
  { to: '/params', label: '参数配置', icon: '⚙', description: '参数与测量记录' },
  { to: '/monitor', label: '异常监控', icon: '🔍', description: '异常检测与处理' },
  { to: '/export', label: '结果导出', icon: '📄', description: '运行报告与历史' }
];

export default function AppLayout() {
  const location = useLocation();
  const exceptions = useAppStore((s) => s.exceptions);
  const pendingCount = exceptions.filter((e) => e.status !== 'resolved').length;

  const currentItem = navItems.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-sand-100">
      {/* 侧边导航 */}
      <aside className="w-56 bg-gradient-to-b from-sand-800 to-sand-900 text-sand-100 flex flex-col">
        <div className="px-5 py-5 border-b border-sand-700">
          <h1 className="text-lg font-bold font-serif text-sand-50">沙丘风蚀体素演示</h1>
          <p className="text-xs text-sand-300 mt-0.5">Dune Erosion Voxel Demo</p>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const showBadge = item.to === '/monitor' && pendingCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md transition text-sm ${
                    isActive
                      ? 'bg-amber text-white shadow-card'
                      : 'text-sand-200 hover:bg-sand-700/60 hover:text-white'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.label}</div>
                  <div className="text-[10px] opacity-70 truncate">{item.description}</div>
                </div>
                {showBadge && (
                  <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-sand-700 text-[11px] text-sand-400 leading-relaxed">
          <div className="font-medium text-sand-300 mb-1">使用提示</div>
          <div>• 先启动模拟再导出报告</div>
          <div>• 视角异常可点击预设恢复</div>
          <div>• 报告含异常拦截原因说明</div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white border-b border-sand-200 flex items-center px-5 gap-4 flex-shrink-0">
          <div>
            <span className="text-sm text-sand-500">当前页面：</span>
            <span className="text-sm font-medium text-sand-800">
              {currentItem?.label ?? '三维演示'}
            </span>
            {currentItem?.description && (
              <span className="text-xs text-sand-400 ml-2">— {currentItem.description}</span>
            )}
          </div>
          <div className="ml-auto text-xs text-sand-500">
            面向规划设计师 · 运维组 · 教师/工程师
          </div>
        </header>

        <main className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
