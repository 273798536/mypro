import { Calendar, Upload, CheckSquare, FileSpreadsheet, Database, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCouponStore } from '../../store/useCouponStore';

const navItems = [
  { path: '/', label: '票息日历', icon: Calendar },
  { path: '/import', label: '数据导入', icon: Upload },
  { path: '/verify', label: '复核面板', icon: CheckSquare },
  { path: '/export', label: '报告导出', icon: FileSpreadsheet },
];

export const Navbar = () => {
  const location = useLocation();
  const { initMockData, clearAllData, couponPlans } = useCouponStore();

  return (
    <nav className="bg-slate-900 text-white px-6 py-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">债券票息核验系统</h1>
            <p className="text-xs text-slate-400">Coupon Verification System</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={initMockData}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Database className="w-4 h-4" />
            生成示例数据
          </button>
          {couponPlans.length > 0 && (
            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
