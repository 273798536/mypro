import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileInput,
  AlertTriangle,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  Thermometer,
} from 'lucide-react';
import { useCalculationStore } from '../../store/useCalculationStore';
import { STATUS_LABELS } from '../../utils/constants';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/data-input', icon: FileInput, label: '数据输入' },
  { path: '/conflicts', icon: AlertTriangle, label: '冲突检测' },
  { path: '/validation', icon: CheckSquare, label: '数据校验' },
  { path: '/calculation', icon: Calculator, label: '计算中心' },
  { path: '/reports', icon: FileSpreadsheet, label: '报告导出' },
];

export default function Sidebar() {
  const { currentCalculation } = useCalculationStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'ready':
        return 'bg-blue-500';
      case 'conflict_pending':
        return 'bg-amber-500';
      case 'validation_failed':
        return 'bg-red-500';
      case 'calculating':
        return 'bg-indigo-500 animate-pulse';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">热桥分析</h1>
            <p className="text-xs text-slate-400">Thermal Bridge Analysis</p>
          </div>
        </div>
      </div>

      {currentCalculation && (
        <div className="p-4 border-b border-slate-700">
          <p className="text-xs text-slate-400 mb-1">当前项目</p>
          <p className="text-sm font-medium truncate">{currentCalculation.name}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(currentCalculation.status)}`}></span>
            <span className="text-xs text-slate-300">
              {STATUS_LABELS[currentCalculation.status]}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          <p>版本 1.0.0</p>
          <p className="mt-1">建筑节能顾问专用</p>
        </div>
      </div>
    </aside>
  );
}
