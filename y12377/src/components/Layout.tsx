import { NavLink, Outlet } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Wrench,
  BarChart3,
  Music,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import ToastContainer from './ToastContainer';

const Layout = () => {
  const { summaryStats } = useStore();
  const totalUnresolved = summaryStats.errorAlerts + summaryStats.warningAlerts;

  const navItems = [
    { path: '/', label: '租赁台账', icon: BookOpen },
    { path: '/entry', label: '单据录入', icon: FileText },
    { path: '/repair', label: '维修归集', icon: Wrench },
    { path: '/summary', label: '对账汇总', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-primary-800 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-md flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold">乐器租赁维修账</h1>
              <p className="text-xs text-primary-300">账务核对系统</p>
            </div>
          </div>
        </div>

        {totalUnresolved > 0 && (
          <div className="mx-4 my-3 p-3 bg-accent-amber bg-opacity-20 rounded-md border border-amber-500">
            <div className="flex items-center gap-2 text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{totalUnresolved} 项待处理提示</span>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-inner'
                    : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-primary-700">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-primary-700 rounded-md">
              <div className="text-lg font-bold">{summaryStats.totalContracts}</div>
              <div className="text-xs text-primary-300">合同总数</div>
            </div>
            <div className="p-2 bg-primary-700 rounded-md">
              <div className="text-lg font-bold text-emerald-400">{summaryStats.activeContracts}</div>
              <div className="text-xs text-primary-300">租赁中</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="font-serif text-xl font-semibold text-primary-900">
            {navItems.find(item => item.path === window.location.pathname)?.label || '租赁台账'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>数据自动保存至本地</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 animate-fade-in-up">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
};

export default Layout;
