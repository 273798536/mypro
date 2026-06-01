import { NavLink, useLocation } from 'react-router-dom';
import {
  Upload,
  Calendar,
  FileText,
  BarChart3,
  AlertTriangle,
  Music2,
} from 'lucide-react';
import { useConflictStore } from '../../store/useConflictStore';

const navItems = [
  { path: '/', label: '数据导入中心', icon: Upload },
  { path: '/board', label: '预约状态看板', icon: Calendar },
  { path: '/review', label: '复盘中心', icon: BarChart3 },
];

export function Sidebar() {
  const location = useLocation();
  const unresolvedCount = useConflictStore(state => state.getUnresolvedCount());

  return (
    <aside className="w-60 bg-primary-900 min-h-screen flex flex-col shadow-xl">
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Music2 className="w-6 h-6 text-primary-800" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold text-white">
              排练室预约
            </h1>
            <p className="text-xs text-primary-300">冲突管理台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.path === '/board' && unresolvedCount > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-primary-700 text-white shadow-inner'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
              {showBadge && (
                <span className="ml-auto bg-conflict text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {unresolvedCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-700">
        <div className="bg-primary-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-primary-200 text-sm mb-2">
            <FileText className="w-4 h-4" />
            <span className="font-medium">数据链路说明</span>
          </div>
          <p className="text-xs text-primary-300 leading-relaxed">
            从排练室表导入到日程导出，每条预约都保留完整的数据来源和版本链路，确保可追溯。
          </p>
        </div>
      </div>
    </aside>
  );
}
