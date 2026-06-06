import { NavLink, Outlet } from 'react-router-dom';
import { LayoutGrid, ListChecks, FileDown, MapPin } from 'lucide-react';

const navItems = [
  { to: '/canvas', label: '画布操作', icon: LayoutGrid },
  { to: '/records', label: '记录管理', icon: ListChecks },
  { to: '/export', label: '导出报告', icon: FileDown },
];

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-[#F5F7FA]">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-soft z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-700 leading-tight">地铁站厅导流贴图系统</h1>
            <p className="text-xs text-gray-500">边界记录测试 · 坐标翻转检测 · 复盘导出</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-soft'
                    : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
