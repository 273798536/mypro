import { Link, Outlet, useLocation } from 'react-router-dom';
import { useBridgeStore, useSimulationStore } from '../store';

const navItems = [
  { path: '/', label: '关卡选择', icon: '🏗️' },
  { path: '/builder', label: '桥梁构建', icon: '🔧' },
  { path: '/simulation', label: '受力模拟', icon: '⚡' },
  { path: '/comparison', label: '复盘对比', icon: '📊' },
  { path: '/versions', label: '版本管理', icon: '📁' },
];

export function AppLayout() {
  const location = useLocation();
  const isDirty = useBridgeStore((state) => state.isDirty);
  const error = useSimulationStore((state) => state.error);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🌉</div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">桥梁受力塔防</h1>
              <p className="text-xs text-slate-500">物理竞赛教学原型系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isDirty && (
              <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm">
                ● 未保存
              </span>
            )}
            <span className="text-sm text-slate-500">V1.0.0</span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  location.pathname === item.path
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {error && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-red-600">
            ⚠️ {error}
          </div>
        </div>
      )}

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          矩阵位移法求解器 | 结果可复现机制 | 物理竞赛教学专用
        </div>
      </footer>
    </div>
  );
}
