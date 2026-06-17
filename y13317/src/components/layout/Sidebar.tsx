import { NavLink } from 'react-router-dom';
import {
  Eye,
  LayoutDashboard,
  Search,
  GitBranch,
  FileCheck2,
  GitCompare,
  Download,
  UserCog,
  User,
} from 'lucide-react';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: '总览仪表盘', icon: LayoutDashboard },
  { path: '/trace', label: '异常追溯', icon: Search },
  { path: '/influence', label: '影响因素分析', icon: GitBranch },
  { path: '/citation', label: '引用完整性校验', icon: FileCheck2 },
  { path: '/version-diff', label: '版本对比中心', icon: GitCompare },
  { path: '/export', label: '导出与一致性', icon: Download },
  { path: '/operator', label: '周姐工作台', icon: UserCog },
];

const Sidebar = () => {
  return (
    <aside className="fixed top-0 left-0 h-screen w-[248px] bg-white border-r border-gray-100 flex flex-col z-40">
      <div className="h-[64px] flex items-center gap-3 px-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-industrial rounded-lg flex items-center justify-center flex-shrink-0">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-gray-900 leading-tight">
            工业视觉改判平台
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5">v2.0</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-industrial text-white'
                      : 'text-gray-600 hover:bg-industrial-50 hover:text-industrial'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : ''}`} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
          <div className="w-10 h-10 bg-industrial rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">周姐</span>
            <span className="text-xs text-gray-500 truncate">标注负责人</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
