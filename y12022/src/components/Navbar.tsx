import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, TrendingUp, GraduationCap, Download } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Navbar = () => {
  const location = useLocation();
  const exportData = useStore((state) => state.exportData);
  const exportToJSON = useStore((state) => state.exportToJSON);

  const navItems = [
    { path: '/', label: '课消确认', icon: LayoutDashboard },
    { path: '/audit', label: '审计日志', icon: FileText },
    { path: '/finance', label: '财务追踪', icon: TrendingUp },
  ];

  const handleExport = (type: 'schedule' | 'attendance' | 'audit' | 'json') => {
    if (type === 'json') {
      const { blob, filename } = exportToJSON();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const { blob, filename } = exportData(type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">课消确认系统</h1>
              <p className="text-xs text-gray-500">线下课程财务管理</p>
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-medium hover:from-teal-600 hover:to-teal-700 transition-all shadow-md shadow-teal-500/30">
                <Download className="w-4 h-4" />
                导出
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => handleExport('schedule')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    排课结论表
                  </button>
                  <button
                    onClick={() => handleExport('attendance')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    课消明细表
                  </button>
                  <button
                    onClick={() => handleExport('audit')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    审计日志表
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                  >
                    完整数据 (JSON)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
