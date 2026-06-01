import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Grid3X3,
  Users,
  TrendingUp,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '@/store/useStore';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
}) => {
  const { currentBatchId, dataSourceValidated } = useStore();

  const menuItems: MenuItem[] = [
    { path: '/', label: '数据概览', icon: <LayoutDashboard size={20} /> },
    { path: '/matrix', label: '转移矩阵', icon: <Grid3X3 size={20} /> },
    { path: '/members', label: '会员明细', icon: <Users size={20} /> },
    { path: '/predict', label: '预测干预', icon: <TrendingUp size={20} /> },
    { path: '/report', label: '报告导出', icon: <FileText size={20} /> },
  ];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-6 border-b border-primary-600">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">
            马尔可夫流失分析
          </h1>
          <p className="text-xs text-primary-200 mt-1">
            Markov Churn Analysis
          </p>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden text-white hover:text-secondary transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive
                      ? 'bg-secondary text-white shadow-lg'
                      : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      className="flex-shrink-0"
                    >
                      {item.icon}
                    </motion.span>
                    <span className="font-medium text-sm">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-primary-600">
        <div className="bg-primary-600/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-primary-200">数据批次</span>
            <span className="text-xs font-medium text-secondary">
              {currentBatchId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-200">同源校验</span>
            {dataSourceValidated ? (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle size={14} />
                已校验
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-danger">
                <AlertTriangle size={14} />
                异常
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-primary flex-col text-white z-40">
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute left-0 top-0 h-screen w-[240px] bg-primary flex-col text-white flex"
          >
            {sidebarContent}
          </motion.aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
