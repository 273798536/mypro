import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Dna,
  FlaskConical,
  GitBranch,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';
import { useAppStore, selectAnomalies } from '../../store/useAppStore';

const navItems = [
  { path: '/dashboard', icon: Home, label: '工作台' },
  { path: '/structure', icon: Dna, label: '蛋白质结构' },
  { path: '/contamination', icon: FlaskConical, label: '污染复核' },
  { path: '/lineage', icon: GitBranch, label: '谱系追踪' },
  { path: '/anomalies', icon: AlertTriangle, label: '异常处理' },
  { path: '/report', icon: FileText, label: '质控报告' },
];

export default function Sidebar() {
  const location = useLocation();
  const anomalies = useAppStore(selectAnomalies);
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed left-0 top-0 h-screen w-[240px] bg-[#0F2B4A] text-white flex flex-col z-50"
    >
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-[2px] flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-['Space_Grotesk'] tracking-tight">
              蛋白质结构突变标注
            </h1>
            <p className="text-xs text-gray-400">育种工作平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showBadge = item.path === '/anomalies' && unresolvedCount > 0;

          return (
            <NavLink key={item.path} to={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative flex items-center gap-3 px-4 py-3 rounded-[2px] transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600/30 text-white border-l-2 border-blue-400'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {unresolvedCount}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-l"
                  />
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-[2px] p-3">
          <p className="text-xs text-gray-400 mb-2">当前批次</p>
          <p className="text-sm font-mono text-cyan-400">BATCH-2026-0612-001</p>
          <p className="text-xs text-gray-500 mt-1">小麦高蛋白品系选育第3代</p>
        </div>
      </div>
    </motion.aside>
  );
}
