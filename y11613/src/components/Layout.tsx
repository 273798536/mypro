import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  ShoppingCart,
  LogOut,
  Settings,
  FileText,
  Menu,
  X,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store';
import Toast from './Toast';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/cards', label: '会员卡', icon: CreditCard },
  { path: '/recharge', label: '充值流水', icon: Wallet },
  { path: '/consume', label: '消费记账', icon: ShoppingCart },
  { path: '/refund', label: '退卡管理', icon: LogOut },
  { path: '/rules', label: '规则配置', icon: Settings },
  { path: '/audit', label: '审计中心', icon: FileText },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { operator, toast } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <aside
        className={`fixed left-0 top-0 h-full bg-navy-900 text-white transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-navy-700">
          {sidebarOpen && (
            <h1 className="text-xl font-display font-bold text-gold-400">储值余额系统</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-navy-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gold-500 text-navy-900 font-semibold'
                    : 'text-gray-300 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-semibold">
              <User size={20} />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{operator}</p>
                <p className="text-xs text-gray-400">财务管理员</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main
        className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}
      >
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-navy-900">
              储值卡沉淀余额管理系统
            </h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
          </div>
        </header>

        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
