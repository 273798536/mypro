import { useCallback } from 'react';
import { History, Trash2, FileText, Clock, AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useNavigate } from 'react-router-dom';

export function HistoryList() {
  const { history, loadFromHistory, deleteFromHistory, saveToHistory, currentRecord } = useAnalysisStore();
  const navigate = useNavigate();

  const handleLoadRecord = useCallback((id: string) => {
    loadFromHistory(id);
    navigate('/');
  }, [loadFromHistory, navigate]);

  const handleDeleteRecord = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFromHistory(id);
  }, [deleteFromHistory]);

  const handleExportReport = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/report/${id}`);
  }, [navigate]);

  const handleSaveCurrent = useCallback(() => {
    if (currentRecord) {
      saveToHistory(currentRecord);
    }
  }, [currentRecord, saveToHistory]);

  const getStatusIcon = (status: string, hasError: boolean, hasWarning: boolean) => {
    if (hasError) return <AlertTriangle className="w-4 h-4 text-error-400" />;
    if (hasWarning) return <AlertTriangle className="w-4 h-4 text-warning-400" />;
    return <CheckCircle2 className="w-4 h-4 text-success-400" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (history.length === 0) {
    return (
      <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-8 text-center">
        <History className="w-12 h-12 text-dark-600 mx-auto mb-4" />
        <p className="text-dark-400">暂无历史记录</p>
        <p className="text-xs text-dark-500 mt-1">完成分析后点击保存按钮保存记录</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
      <div className="px-4 py-3 bg-dark-800 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-400" />
          <span className="font-medium text-white">历史记录</span>
          <span className="text-xs text-dark-400">({history.length})</span>
        </div>
        {currentRecord && (
          <button
            onClick={handleSaveCurrent}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors"
          >
            <Play className="w-3 h-3" />
            保存当前
          </button>
        )}
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {history.map((record) => {
          const hasError = record.anomalies.some(a => a.severity === 'error');
          const hasWarning = record.anomalies.some(a => a.severity === 'warning');

          return (
            <div
              key={record.id}
              className="p-4 border-b border-dark-700/50 last:border-b-0 hover:bg-dark-700/30 transition-colors cursor-pointer group"
              onClick={() => handleLoadRecord(record.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(record.status, hasError, hasWarning)}
                    <span className="font-medium text-white text-sm truncate">
                      {record.source.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-dark-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(record.createdAt)}
                    <span className="mx-1">·</span>
                    <span className="font-mono">{record.results.velocity.toFixed(1)} m/s</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-dark-500">
                      f₀: <span className="font-mono text-dark-300">{record.parameters.baseFrequency} Hz</span>
                    </span>
                    <span className="text-dark-500">
                      频移: <span className="font-mono text-dark-300">{record.results.frequencyShift.toFixed(1)} Hz</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExportReport(record.id, e)}
                    className="p-2 rounded-lg hover:bg-dark-600 text-dark-400 hover:text-primary-400 transition-colors"
                    title="导出报告"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteRecord(record.id, e)}
                    className="p-2 rounded-lg hover:bg-dark-600 text-dark-400 hover:text-error-400 transition-colors"
                    title="删除记录"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
