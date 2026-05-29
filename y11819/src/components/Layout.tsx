import { NavLink, Outlet } from 'react-router-dom';
import { Ship, Upload, Calculator, Download, Anchor } from 'lucide-react';

const navItems = [
  { to: '/import', label: '数据导入', icon: Upload },
  { to: '/result', label: '试算结果', icon: Calculator },
  { to: '/export', label: '筛选导出', icon: Download },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-steel-50 font-sans">
      <nav className="w-56 bg-navy-900 flex flex-col shrink-0">
        <div className="px-5 py-6 flex items-center gap-3 border-b border-navy-700">
          <div className="w-9 h-9 bg-port-500 rounded-lg flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">港口滞期费</h1>
            <p className="text-navy-300 text-xs">试算系统</p>
          </div>
        </div>

        <div className="flex-1 py-4">
          <div className="px-4 mb-2">
            <span className="text-navy-400 text-[10px] font-semibold uppercase tracking-wider">功能导航</span>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all duration-200 mx-2 rounded-lg ${
                  isActive
                    ? 'bg-port-500/15 text-port-400'
                    : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-navy-700">
          <div className="flex items-center gap-2 text-navy-300 text-xs">
            <Ship className="w-3.5 h-3.5" />
            <span>航运结算员工作台</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
