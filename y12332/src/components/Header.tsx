import { useState, useEffect } from 'react';
import { Bell, User, RefreshCw, AlertCircle, X, Database } from 'lucide-react';
import { useAppStore } from '@/store';
import { formatDateTime } from '@/utils/helpers';

const Header = () => {
  const { 
    anomalies, 
    currentBatchId, 
    batches, 
    setCurrentBatch,
    error,
    clearError,
    loadMockData
  } = useAppStore();
  
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
  const currentBatch = batches.find(b => b.batchId === currentBatchId);

  useEffect(() => {
    if (!currentBatchId && batches.length === 0) {
      loadMockData();
    }
  }, [currentBatchId, batches.length, loadMockData]);

  return (
    <>
      <header className="fixed top-0 left-[260px] right-0 h-16 bg-dark-900/60 backdrop-blur-xl border-b border-dark-700/50 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              冷链温度异常检测系统
            </h2>
            <div className="text-xs text-dark-400">
              实时监控 · 智能检测 · 精准诊断
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {currentBatch && (
            <button
              onClick={() => setShowBatchSelector(!showBatchSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800/80 rounded-lg border border-dark-700 hover:border-cold-500/50 transition-all group"
            >
              <Database className="w-4 h-4 text-cold-400" />
              <span className="text-sm text-dark-200">{currentBatch.name}</span>
              <span className="text-xs text-dark-500">
                {formatDateTime(currentBatch.importedAt)}
              </span>
            </button>
          )}

          <button
            onClick={() => loadMockData()}
            className="p-2 rounded-lg bg-dark-800/80 border border-dark-700 hover:border-cold-500/50 hover:text-cold-400 transition-all"
            title="刷新数据"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <div className="relative">
            <button className="p-2 rounded-lg bg-dark-800/80 border border-dark-700 hover:border-alert-orange/50 hover:text-alert-orange transition-all">
              <Bell className="w-5 h-5" />
              {criticalAnomalies > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-alert-red rounded-full text-[10px] font-bold flex items-center justify-center text-white animate-pulse">
                  {criticalAnomalies}
                </span>
              )}
            </button>
          </div>

          <div className="w-px h-8 bg-dark-700" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">数据分析师</div>
              <div className="text-xs text-dark-400">admin@coldchain.com</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cold-400 to-cold-600 flex items-center justify-center shadow-lg shadow-cold-500/30">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="fixed top-20 right-6 z-50 animate-slide-in">
          <div className="flex items-center gap-3 px-4 py-3 bg-alert-red/10 border border-alert-red/30 rounded-lg backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-alert-red flex-shrink-0" />
            <span className="text-sm text-alert-red">{error}</span>
            <button
              onClick={clearError}
              className="p-1 hover:bg-alert-red/20 rounded transition-colors"
            >
              <X className="w-4 h-4 text-alert-red" />
            </button>
          </div>
        </div>
      )}

      {showBatchSelector && (
        <div className="fixed top-20 right-60 z-50 w-80 card p-4 animate-slide-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">选择数据批次</h3>
            <button
              onClick={() => setShowBatchSelector(false)}
              className="p-1 hover:bg-dark-700 rounded transition-colors"
            >
              <X className="w-4 h-4 text-dark-400" />
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {batches.map((batch) => (
              <button
                key={batch.batchId}
                onClick={() => {
                  setCurrentBatch(batch.batchId);
                  setShowBatchSelector(false);
                }}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  batch.batchId === currentBatchId
                    ? 'bg-cold-500/20 border border-cold-500/50'
                    : 'bg-dark-800/50 border border-dark-700 hover:border-cold-500/30'
                }`}
              >
                <div className="font-mono text-sm text-white">{batch.name}</div>
                <div className="text-xs text-dark-400 mt-1">
                  {formatDateTime(batch.importedAt)} · {batch.importedBy}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    batch.completeness >= 95 ? 'bg-green-500/20 text-green-400' :
                    batch.completeness >= 80 ? 'bg-alert-yellow/20 text-alert-yellow' :
                    'bg-alert-red/20 text-alert-red'
                  }`}>
                    完整率 {batch.completeness.toFixed(1)}%
                  </span>
                  <span className="text-xs text-dark-500">
                    {batch.sourceFiles.length} 个文件
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
