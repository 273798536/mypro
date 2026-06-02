import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  FileUp,
  FileDown,
  Music,
  Package,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '@/store/useAppStore';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/check', label: '清单核对', icon: ListChecks },
  { path: '/import', label: '样例导入', icon: FileUp },
  { path: '/export', label: '导出清单', icon: FileDown },
];

const Sidebar = () => {
  const location = useLocation();
  const { getStatistics } = useAppStore();
  const stats = getStatistics();

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 min-h-screen bg-midnight-900/95 backdrop-blur-xl border-r border-midnight-700 flex flex-col"
    >
      <div className="p-6 border-b border-midnight-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gold-gradient rounded-btn flex items-center justify-center shadow-lg">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gradient-gold">
              乐团巡演
            </h1>
            <p className="text-xs text-midnight-400">物流清单系统</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <motion.div
              key={item.path}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <NavLink
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-btn transition-all duration-200
                  ${isActive
                    ? 'bg-amber-gold-600/20 text-amber-gold-400 border-l-4 border-l-amber-gold-500 shadow-inner'
                    : 'text-midnight-300 hover:bg-midnight-800 hover:text-white border-l-4 border-l-transparent'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-midnight-700">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-alert-red" />
            <span className="text-sm font-medium text-midnight-200">异常概览</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-midnight-400 flex items-center gap-1">
                <Package className="w-3 h-3" /> 漏箱
              </span>
              <span className="badge-danger">{stats.missingBox}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-midnight-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 保险过期
              </span>
              <span className="badge-warning">{stats.insuranceExpired}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-midnight-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> 城市错配
              </span>
              <span className="badge-warning">{stats.cityMismatch}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-midnight-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 晚到
              </span>
              <span className="badge-danger">{stats.lateArrival}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

const Clock = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default Sidebar;
