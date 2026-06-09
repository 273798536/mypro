import { AlertTriangle, X, GitMerge, RefreshCw, XCircle } from 'lucide-react';
import { useAppStore } from '@/store';
import { formatDate, formatNumber } from '@/utils/format';

export default function DuplicateModal() {
  const { duplicateCheckResult, pendingSlice, resolveDuplicate, clearDuplicateCheck } =
    useAppStore();

  if (!duplicateCheckResult || !pendingSlice) return null;

  const existing = duplicateCheckResult.existingSlice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-warning-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">检测到重复数据</h2>
              <p className="text-sm text-tech-gray-400">该批次数据已存在，请选择处理方式</p>
            </div>
          </div>
          <button
            onClick={clearDuplicateCheck}
            className="p-2 rounded-lg hover:bg-white/10 text-tech-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-tech-gray-900/60 border border-white/10">
              <p className="text-xs text-tech-gray-400 mb-2">已有数据</p>
              {existing && (
                <div className="space-y-1">
                  <p className="text-white font-medium">{existing.tankName}</p>
                  <p className="text-sm text-tech-gray-400">
                    {formatDate(existing.timestamp)}
                  </p>
                  <p className="text-sm text-deep-sea-400">
                    {formatNumber(existing.pointCount, 0)} 个点
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-tech-gray-900/60 border border-warning-orange-500/30">
              <p className="text-xs text-warning-orange-500 mb-2">新导入数据</p>
              <div className="space-y-1">
                <p className="text-white font-medium">{pendingSlice.tankName}</p>
                <p className="text-sm text-tech-gray-400">
                  {formatDate(pendingSlice.timestamp)}
                </p>
                <p className="text-sm text-deep-sea-400">
                  {formatNumber(pendingSlice.pointCount, 0)} 个点
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-tech-gray-900/40 border border-white/5">
            <p className="text-xs text-tech-gray-400 mb-1">数据指纹</p>
            <code className="text-xs text-tech-gray-300 font-mono break-all">
              {pendingSlice.fingerprint}
            </code>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => resolveDuplicate('cancel')}
              className="flex-1 flex items-center justify-center gap-2 btn-secondary"
            >
              <XCircle className="w-4 h-4" />
              取消导入
            </button>
            <button
              onClick={() => resolveDuplicate('merge')}
              className="flex-1 flex items-center justify-center gap-2 btn-primary"
            >
              <GitMerge className="w-4 h-4" />
              合并数据
            </button>
            <button
              onClick={() => resolveDuplicate('replace')}
              className="flex-1 flex items-center justify-center gap-2 btn-warning"
            >
              <RefreshCw className="w-4 h-4" />
              覆盖替换
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
