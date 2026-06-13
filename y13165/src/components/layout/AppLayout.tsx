import { Link, useLocation } from 'react-router-dom';
import { Upload, Table, BarChart3, Zap, Download } from 'lucide-react';
import { exportResultsToExcel } from '@/utils/excelExporter';
import { useTorqueStore } from '@/store/useTorqueStore';

const navItems = [
  { path: '/', label: '数据导入', icon: Upload },
  { path: '/detail', label: '复算明细', icon: Table },
  { path: '/chart', label: '图表可视化', icon: BarChart3 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { results, records, batches } = useTorqueStore();

  const handleExport = () => {
    if (results.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    exportResultsToExcel(results, records, batches);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-56 bg-slate-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-bold tracking-wide">扭矩复算工具</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Motor Torque Recalc</p>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">快速操作</div>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {results.length > 0 && (
              <span>
                共 <span className="font-semibold text-slate-700">{results.length}</span> 条记录
                {batches.length > 0 && (
                  <span className="ml-3">
                    <span className="font-semibold text-slate-700">{batches.length}</span> 个批次
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            设备铭牌 · 电机扭矩实验复算
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
