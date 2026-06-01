import { NavLink } from 'react-router-dom';
import {
  Activity,
  Upload,
  Database,
  BarChart3,
  AlertTriangle,
  FileText,
  Thermometer,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { formatDateTime } from '@/utils/helpers';

const navItems = [
  { path: '/', icon: Activity, label: '时序异常看板', description: '温度趋势与异常分布' },
  { path: '/import', icon: Upload, label: '数据导入中心', description: '多源数据整合' },
  { path: '/detail', icon: Database, label: '明细查询', description: '原始数据与处理结果' },
  { path: '/compare', icon: BarChart3, label: '分组对比', description: '多维度对比分析' },
  { path: '/diagnosis', icon: AlertTriangle, label: '根因诊断', description: '异常原因分析' },
  { path: '/export', icon: FileText, label: '报告导出', description: '生成检测报告' },
];

const Sidebar = () => {
  const { currentBatchId, batches, isLoading } = useAppStore();
  const currentBatch = batches.find((b) => b.batchId === currentBatchId);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-dark-900/80 backdrop-blur-xl border-r border-dark-700/50 flex flex-col z-50">
      <div className="p-6 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cold-400 to-cold-600 flex items-center justify-center shadow-lg shadow-cold-500/30">
            <Thermometer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-lg text-white glow-text">
              ColdMonitor
            </h1>
            <p className="text-[10px] text-dark-400 tracking-wider">
              异常检测温控看板
            </p>
          </div>
        </div>
      </div>

      {currentBatch && (
        <div className="p-4 mx-3 mt-3 rounded-lg bg-gradient-to-r from-cold-500/10 to-transparent border border-cold-500/20">
          <div className="text-[10px] text-cold-400 uppercase tracking-wider mb-1">
            当前数据批次
          </div>
          <div className="font-mono text-sm text-white truncate">
            {currentBatch.name}
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            完整率: {currentBatch.completeness.toFixed(2)}%
          </div>
          <div className="text-[11px] text-dark-500">
            {formatDateTime(currentBatch.importedAt)}
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="text-[10px] text-dark-500 uppercase tracking-wider px-4 mb-2">
          功能模块
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item group mb-1 ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-[10px] text-dark-500 truncate">
                {item.description}
              </div>
            </div>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-dark-700/50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-dark-700/30 cursor-pointer transition-colors">
          <Settings className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-300">系统设置</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-dark-700/30 cursor-pointer transition-colors">
          <HelpCircle className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-300">帮助文档</span>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-cold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-sm text-cold-400">处理中...</div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
