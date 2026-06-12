import { Bell, Settings, User } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

export default function Header() {
  const { batches, currentBatchId } = useAppStore();

  const currentBatch = batches.find(b => b.id === currentBatchId);

  return (
    <header className="h-14 bg-ocean-700/50 border-b border-teal-glow-500/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <span className="text-xs text-ocean-200/50">当前批次</span>
          <div className="text-sm font-medium text-white">
            {currentBatch?.name || '加载中...'}
          </div>
        </div>
        {currentBatch && (
          <span className={`px-2 py-0.5 text-xs rounded ${
            currentBatch.status === 'completed'
              ? 'bg-data-status-available/20 text-data-status-available'
              : 'bg-data-status-pending/20 text-data-status-pending'
          }`}>
            {currentBatch.status === 'completed' ? '已完成' : '处理中'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          <div className="text-xs text-ocean-200/50">数据完整度</div>
          <div className="text-sm font-mono text-teal-glow-400">
            {currentBatch ? `${(currentBatch.dataCompleteness * 100).toFixed(0)}%` : '--'}
          </div>
        </div>

        <button className="p-2 rounded hover:bg-ocean-600/50 transition-colors text-ocean-200/60 hover:text-white">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 rounded hover:bg-ocean-600/50 transition-colors text-ocean-200/60 hover:text-white">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-glow-400 to-ocean-400 flex items-center justify-center">
          <User className="w-4 h-4 text-ocean-900" />
        </div>
      </div>
    </header>
  );
}
