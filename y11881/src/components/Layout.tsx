import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  CalendarClock,
  TrendingUp,
  FileBarChart,
  Menu,
  X,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store';
import { Button } from './ui/Button';

const navItems = [
  { path: '/', label: '主控制台', icon: LayoutDashboard },
  { path: '/calculator', label: '找零计算', icon: Calculator },
  { path: '/shift', label: '班次管理', icon: CalendarClock },
  { path: '/analytics', label: '库存分析', icon: TrendingUp },
  { path: '/reports', label: '报告中心', icon: FileBarChart },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { initStore, clearData, currentShift, denominations, inventory } = useStore();

  useEffect(() => {
    initStore();
  }, [initStore]);

  const criticalCount = denominations.filter((d) => {
    const inv = inventory.find((i) => i.denominationId === d.id);
    return inv && inv.quantity <= d.criticalThreshold;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-slate-800" />
          <span className="font-bold text-slate-800">找零优化</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-800">现金找零</div>
                <div className="text-xs text-gray-500">库存优化系统</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.path === '/' && criticalCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {criticalCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            {currentShift && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">当前班次</div>
                <div className="font-medium text-slate-800">{currentShift.name}</div>
                <div className="text-sm text-gray-500">{currentShift.operator}</div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={clearData}
            >
              重置数据
            </Button>
          </div>
        </div>
      </motion.aside>

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
