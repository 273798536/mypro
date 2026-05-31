import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Save, GitCompare, Clock, Trash2, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatDuration } from '@/types';
import { formatTimestamp, cn } from '@/utils/helpers';
import { exportScheduleToCSV, downloadCSV } from '@/services/export';

export function VersionHistory() {
  const { history, saveVersion, loadVersion, toggleCompare, compareMode, compareVersionId, tracks, ruleSet, currentValidation } = useStore();
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveVersion(saveDescription || '手动保存');
      setSaveDescription('');
      setIsSaving(false);
    }, 300);
  };

  const handleExport = (version: any) => {
    const csv = exportScheduleToCSV(version.tracks, version.ruleSet, version.validationResult);
    downloadCSV(csv, `演出排期-${version.name}-${new Date(version.timestamp).toISOString().slice(0, 10)}.csv`);
  };

  const handleExportCurrent = () => {
    if (!currentValidation) return;
    const csv = exportScheduleToCSV(tracks, ruleSet, currentValidation);
    downloadCSV(csv, `演出排期-当前版本-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="bg-indigo-900/30 rounded-xl p-5 border border-indigo-800">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-450" />
          <h3 className="font-semibold text-lg">版本历史</h3>
          <span className="text-xs text-gray-400">({history.length})</span>
        </div>
        {currentValidation && (
          <button
            onClick={handleExportCurrent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            导出当前
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={saveDescription}
          onChange={(e) => setSaveDescription(e.target.value)}
          placeholder="输入保存备注..."
          className="flex-1 px-3 py-2 bg-indigo-800 border border-indigo-700 rounded-lg text-sm focus:outline-none focus:border-amber-450 transition-colors"
          disabled={!currentValidation}
        />
        <button
          onClick={handleSave}
          disabled={!currentValidation || isSaving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            currentValidation && !isSaving
              ? 'bg-amber-450 text-indigo-950 hover:bg-amber-400'
              : 'bg-indigo-800 text-gray-500 cursor-not-allowed'
          )}
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无历史版本</p>
          <p className="text-xs mt-1">保存当前状态以创建版本记录</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          <AnimatePresence>
            {history.map((version, index) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'p-3 rounded-lg border transition-all',
                  compareVersionId === version.id
                    ? 'bg-amber-450/10 border-amber-450'
                    : 'bg-indigo-800/30 border-indigo-700 hover:border-indigo-600'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{version.name}</span>
                      {index === 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-450/20 text-amber-450 rounded">最新</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{version.changeDescription}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(version.timestamp)}
                      </span>
                      <span className="font-mono">
                        {formatDuration(version.validationResult.totalDuration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => loadVersion(version.id)}
                      className="p-1.5 hover:bg-indigo-700 rounded transition-colors"
                      title="加载此版本"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleCompare(compareVersionId === version.id ? null : version.id)}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        compareVersionId === version.id
                          ? 'bg-amber-450/20 text-amber-450'
                          : 'hover:bg-indigo-700'
                      )}
                      title={compareVersionId === version.id ? '取消对比' : '与当前对比'}
                    >
                      <GitCompare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(version)}
                      className="p-1.5 hover:bg-indigo-700 rounded transition-colors"
                      title="导出版本"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {compareMode && compareVersionId && (
        <div className="mt-4 p-3 bg-amber-450/10 border border-amber-450/30 rounded-lg">
          <p className="text-sm text-amber-450">
            💡 对比模式已开启，正在与选中版本进行对比
          </p>
        </div>
      )}
    </div>
  );
}
