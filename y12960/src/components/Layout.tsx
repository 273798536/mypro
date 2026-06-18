import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Database,
  GitCompare,
  Shield,
  FlaskConical,
  Table,
  Download,
  Upload,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { permissionApi } from '../api/client';
import { roleConfig } from '../utils/formatters';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/', icon: Table, label: '变更列表', roles: ['admin', 'bi_analyst', 'dev'] },
  { path: '/schema-compare', icon: GitCompare, label: 'Schema对比', roles: ['admin', 'bi_analyst'] },
  { path: '/import-test', icon: FlaskConical, label: '重复导入测试', roles: ['admin', 'bi_analyst'] },
  { path: '/permissions', icon: Shield, label: '权限管理', roles: ['admin'] },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { currentUser, setCurrentUser, currentRole, setCurrentRole } = useStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, [currentRole]);

  const loadCurrentUser = async () => {
    try {
      const res = await permissionApi.getCurrentUser();
      if (res.success) {
        setCurrentUser(res.data);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const availableMenuItems = menuItems.filter((item) =>
    item.roles.includes(currentRole)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">数据字典变更提醒</h1>
              <p className="text-xs text-slate-400">Data Dictionary Alert</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <div className="px-4 mb-2">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              功能菜单
            </span>
          </div>
          {availableMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User & Role */}
        <div className="p-4 border-t border-slate-700">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: roleConfig[currentRole].color }}
                >
                  {currentUser?.name?.[0] || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{currentUser?.name || '用户'}</p>
                  <p className={`text-xs ${roleConfig[currentRole].className.replace('bg-', 'text-').replace('100', '400')}`}>
                    {roleConfig[currentRole].label}
                  </p>
                </div>
              </div>
              <Settings className="w-4 h-4 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-700">
                  <p className="text-xs text-slate-400">切换角色视图</p>
                </div>
                {(['admin', 'bi_analyst', 'dev'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setCurrentRole(role);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors ${
                      currentRole === role ? 'bg-slate-700' : ''
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: roleConfig[role].color }}
                    />
                    <span className="text-sm text-white">{roleConfig[role].label}</span>
                    {currentRole === role && (
                      <span className="ml-auto text-xs text-blue-400">当前</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {availableMenuItems.find((m) => m.path === location.pathname)?.label ||
                  '数据字典变更提醒'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                状态：系统运行正常 · 最近同步：{new Date().toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {currentRole !== 'dev' && (
                <>
                  <button
                    onClick={() => permissionApi.getCurrentUser().then(() => {})}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    导入变更
                  </button>
                  <button
                    onClick={() => {}}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    导出报告
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
