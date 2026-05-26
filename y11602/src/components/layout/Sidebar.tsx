import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileUp, FileDown, Settings } from 'lucide-react';

const navItems = [
  { path: '/', label: '总览看板', icon: LayoutDashboard },
  { path: '/loans', label: '授信清单', icon: Users },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/export', label: '报告导出', icon: FileDown },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary-950 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-800">
        <h1 className="text-xl font-bold">小微贷款续授信管理</h1>
        <p className="text-primary-300 text-sm mt-1">Micro Loan Renewal</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-700 text-white'
                        : 'text-primary-200 hover:bg-primary-900 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-primary-800">
        <div className="flex items-center gap-3 px-4 py-3 text-primary-300 text-sm">
          <Settings size={18} />
          <span>当前用户：客户经理</span>
        </div>
      </div>
    </aside>
  );
}
