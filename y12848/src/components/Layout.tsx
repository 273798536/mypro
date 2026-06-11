import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileCheck, Eye, User, FlaskConical, ShieldCheck } from 'lucide-react';
import { useEthicsStore } from '../store/useEthicsStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentUser = useEthicsStore((s) => s.currentUser);
  const setUserRole = useEthicsStore((s) => s.setUserRole);

  const navItems = [
    { path: '/', label: '样本质控', icon: LayoutDashboard },
    { path: '/ethics-review', label: '伦理材料核对', icon: FileCheck },
    { path: '/supervisor-report', label: '导师报告', icon: Eye },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b border-primary-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-primary-800">动物实验伦理材料核对系统</h1>
                <p className="text-xs text-gray-500">单一数据源 · 完整追溯 · 闭环复核</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2 pl-6 border-l border-gray-200">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-700" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{currentUser.name}</p>
                  <p className="text-xs text-gray-500">
                    {currentUser.role === 'teacher' ? '生物老师' : '导师'}
                  </p>
                </div>
                <select
                  value={currentUser.role}
                  onChange={(e) => setUserRole(e.target.value as 'teacher' | 'supervisor')}
                  className="ml-2 text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:border-primary-500"
                >
                  <option value="teacher">切换为老师</option>
                  <option value="supervisor">切换为导师</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-2">
          <FlaskConical className="w-3 h-3" />
          <span>动物实验伦理材料核对系统 · 确保数据一致性与可追溯性</span>
        </div>
      </footer>
    </div>
  );
}
