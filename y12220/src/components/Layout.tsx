import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Ticket,
  Plane,
  DollarSign,
  CheckSquare,
  History,
  BarChart3,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import StatusBadge from './StatusBadge';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, rebookRecords } = useStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pendingCount = rebookRecords.filter(r => r.status === 'pending').length;

  const menuItems = [
    { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
    { path: '/tickets', label: '客票管理', icon: Ticket },
    { path: '/segments', label: '航段配置', icon: Plane },
    { path: '/rebook/new', label: '改签计算', icon: PlusCircle },
    { path: '/review', label: '待我复核', icon: CheckSquare, badge: pendingCount },
    { path: '/history', label: '历史记录', icon: History },
    { path: '/reports', label: '报表中心', icon: BarChart3 },
    { path: '/settings', label: '系统设置', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/rebook/new') {
      return location.pathname.startsWith('/rebook');
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = currentUser?.name?.charAt(0) || 'U';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-primary-700 min-h-screen flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-primary-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">航司改签系统</h1>
              <p className="text-primary-200 text-xs">差价结算与复核</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 bg-accent-amber-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-primary-600">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {currentUser?.name}
              </div>
              <div className="text-primary-200 text-xs">
                {currentUser?.role === 'admin' ? '管理员' : currentUser?.role === 'reviewer' ? '复核员' : '结算员'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-6 h-16">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 max-w-md">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索客票号、旅客姓名..."
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                  <Bell className="w-5 h-5 text-slate-600" />
                  {pendingCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-accent-amber-500 text-white text-xs font-bold rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {userInitial}
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {currentUser?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-900">
                          {currentUser?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {currentUser?.role === 'admin' ? '管理员' : currentUser?.role === 'reviewer' ? '复核员' : '结算员'}
                        </p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
