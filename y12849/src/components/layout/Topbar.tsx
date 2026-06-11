import { motion } from 'framer-motion';
import { User, Bell, Settings, ChevronDown, Database } from 'lucide-react';
import { useAppStore, selectCurrentBatch, selectAnomalies } from '../../store/useAppStore';

const statusColors = {
  processing: 'bg-blue-500',
  reviewing: 'bg-yellow-500',
  completed: 'bg-green-500',
  blocked: 'bg-red-500',
};

const statusLabels = {
  processing: '处理中',
  reviewing: '复核中',
  completed: '已完成',
  blocked: '已拦截',
};

export default function Topbar() {
  const batch = useAppStore(selectCurrentBatch);
  const anomalies = useAppStore(selectAnomalies);
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
      className="fixed top-0 left-[240px] right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{batch.name}</h2>
            <p className="text-xs text-gray-500">
              {new Date(batch.date).toLocaleDateString('zh-CN')} · {batch.samples.length} 个样本
            </p>
          </div>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors[batch.status]}`} />
          <span className="text-xs font-medium text-gray-700">{statusLabels[batch.status]}</span>
        </div>
        {batch.batchEffect.blocked && (
          <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            批次效应已拦截
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[2px] transition-colors">
          <Bell className="w-5 h-5" />
          {unresolvedCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unresolvedCount}
            </span>
          )}
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[2px] transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <div className="h-8 w-px bg-gray-200" />
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-[2px] transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-[2px] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">张育种</p>
            <p className="text-xs text-gray-500">育种专员</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </motion.header>
  );
}
