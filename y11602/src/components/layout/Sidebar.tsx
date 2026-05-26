import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileUp, FileDown, User, Shield, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../../store/AppContext';

const managerNavItems = [
  { path: '/', label: '总览看板', icon: LayoutDashboard },
  { path: '/loans', label: '授信清单', icon: Users },
  { path: '/import', label: '数据导入', icon: FileUp },
  { path: '/export', label: '报告导出', icon: FileDown },
];

const executiveNavItems = [
  { path: '/', label: '总览看板', icon: LayoutDashboard },
  { path: '/loans', label: '授信清单', icon: Users },
  { path: '/export', label: '报告导出', icon: FileDown },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { state, logout, isManager } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = isManager() ? managerNavItems : executiveNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        {state.currentUser ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-900 hover:bg-primary-800 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
                {isManager() ? <User size={16} /> : <Shield size={16} />}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">{state.currentUser.displayName}</div>
                <div className="text-xs text-primary-300">
                  {isManager() ? '客户经理' : '管理层'}
                </div>
              </div>
              {showUserMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="font-medium text-gray-900">{state.currentUser.displayName}</div>
                  <div className="text-sm text-gray-500">
                    角色：{isManager() ? '客户经理' : '管理层'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 text-primary-300 text-sm">
            未登录
          </div>
        )}
      </div>
    </aside>
  );
}
