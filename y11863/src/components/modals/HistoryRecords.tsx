import { useEffect } from 'react';
import { X, Clock, Trash2, RotateCcw, Eye, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getEnergyTypeLabel } from '../../utils/screenshot';

export const HistoryRecords = () => {
  const {
    isHistoryOpen,
    setHistoryOpen,
    historyRecords,
    isLoading,
    loadHistoryRecords,
    restoreView,
    removeHistoryRecord,
  } = useAppStore();

  useEffect(() => {
    if (isHistoryOpen && loadHistoryRecords) {
      loadHistoryRecords();
    }
  }, [isHistoryOpen, loadHistoryRecords]);

  if (!isHistoryOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Clock size={20} />
            历史记录
          </h2>
          <button
            onClick={() => setHistoryOpen(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : historyRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={64} className="mx-auto text-slate-500 mb-4 opacity-50" />
              <h3 className="text-white font-semibold text-lg mb-2">暂无历史记录</h3>
              <p className="text-slate-400">保存视角后，记录将显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyRecords.map((record) => (
                <div
                  key={record.id}
                  className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{record.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>
                          {getEnergyTypeLabel(record.parameters.energyType)}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-slate-400 text-sm mt-2 bg-slate-700/50 rounded p-2">
                          {record.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreView(record)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                      >
                        <RotateCcw size={14} />
                        恢复视角
                      </button>
                      <button
                        onClick={() => removeHistoryRecord(record.id)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-700">
          <button
            onClick={() => setHistoryOpen(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
