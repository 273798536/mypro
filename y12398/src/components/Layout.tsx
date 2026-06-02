import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  AlertTriangle,
  ClipboardList,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '首页仪表盘', icon: LayoutDashboard },
  { path: '/devices', label: '设备清单', icon: Package },
  { path: '/records', label: '借还记录', icon: Receipt },
  { path: '/anomalies', label: '异常检测', icon: AlertTriangle },
  { path: '/inventory', label: '库存盘点', icon: ClipboardList },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { loadSampleData, exportExcel, error, setError, conclusions } = useStore();
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleLoadSample = async () => {
    setActionLoading(true);
    const success = await loadSampleData();
    setActionLoading(false);
    if (success) {
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleExport = async () => {
    setActionLoading(true);
    await exportExcel();
    setActionLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-primary-950 text-white flex flex-col">
        <div className="p-6 border-b border-primary-800">
          <h1 className="text-xl font-serif font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-amber-400" />
            音乐社团设备借还
          </h1>
          <p className="text-primary-300 text-sm mt-1">设备管理 · 证据追溯</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 animate-stagger ${isActive ? 'bg-white/10' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400' : 'text-primary-300'}`} />
                <span className={isActive ? 'font-medium' : 'text-primary-200'}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-800 space-y-2">
          <button
            onClick={handleLoadSample}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-primary-950 rounded-lg font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {actionLoading ? '导入中...' : '导入样例数据'}
          </button>
          <button
            onClick={handleExport}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary-950 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            导出清单
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-semibold text-slate-900">
                {navItems.find(item => item.path === location.pathname)?.label || '系统'}
              </h2>
            </div>
            {error && (
              <div className="px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="p-8">
            {children}
          </div>
        </div>

        {conclusions.length > 0 && (
          <div className="bg-primary-950 text-white px-8 py-4 border-t border-primary-800">
            <h3 className="text-sm font-medium text-amber-400 mb-2">终端摘要 · 借还状态结论</h3>
            <ul className="text-sm text-primary-100 space-y-1">
              {conclusions.slice(0, 2).map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400">{i + 1}.</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
};
