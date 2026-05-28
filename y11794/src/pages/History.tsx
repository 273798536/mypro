import { useCallback, useState } from 'react';
import { Trash2, FileText, Clock, AlertTriangle, CheckCircle2, Download, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../store/analysisStore';

export function History() {
  const navigate = useNavigate();
  const { history, loadFromHistory, deleteFromHistory, clearHistory } = useAnalysisStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter(record =>
    record.source.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLoadRecord = useCallback((id: string) => {
    loadFromHistory(id);
    navigate('/');
  }, [loadFromHistory, navigate]);

  const handleDeleteRecord = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteFromHistory(id);
    }
  }, [deleteFromHistory]);

  const handleExportReport = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/report/${id}`);
  }, [navigate]);

  const handleClearHistory = useCallback(() => {
    if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
      clearHistory();
    }
  }, [clearHistory]);

  const getStatusIcon = (hasError: boolean, hasWarning: boolean) => {
    if (hasError) return <AlertTriangle className="w-4 h-4 text-error-400" />;
    if (hasWarning) return <AlertTriangle className="w-4 h-4 text-warning-400" />;
    return <CheckCircle2 className="w-4 h-4 text-success-400" />;
  };

  const getStatusText = (hasError: boolean, hasWarning: boolean) => {
    if (hasError) return '存在错误';
    if (hasWarning) return '存在警告';
    return '正常';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">历史记录</h2>
            <p className="text-sm text-dark-400 mt-1">
              共 {filteredHistory.length} 条分析记录
            </p>
          </div>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-4 py-2 bg-error-500/10 text-error-400 rounded-lg hover:bg-error-500/20 transition-colors border border-error-500/30"
              >
                <Trash2 className="w-4 h-4" />
                清空记录
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件名..."
              className="w-full bg-dark-800 border border-dark-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="bg-dark-800/50 rounded-2xl border border-dark-700 p-12 text-center">
            <Clock className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">暂无历史记录</h3>
            <p className="text-dark-400">
              {searchQuery ? '未找到匹配的记录' : '完成分析后，记录会自动保存到这里'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((record) => {
              const hasError = record.anomalies.some(a => a.severity === 'error');
              const hasWarning = record.anomalies.some(a => a.severity === 'warning');

              return (
                <div
                  key={record.id}
                  className="bg-dark-800/50 rounded-xl border border-dark-700 p-5 hover:border-dark-600 transition-colors cursor-pointer group"
                  onClick={() => handleLoadRecord(record.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(hasError, hasWarning)}
                        <h3 className="font-medium text-white truncate max-w-md">
                          {record.source.fileName}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          hasError
                            ? 'bg-error-500/20 text-error-400'
                            : hasWarning
                            ? 'bg-warning-500/20 text-warning-400'
                            : 'bg-success-500/20 text-success-400'
                        }`}>
                          {getStatusText(hasError, hasWarning)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-dark-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(record.createdAt)}
                        </span>
                        <span>时长: {record.source.duration.toFixed(2)}s</span>
                        <span>采样率: {record.source.sampleRate} Hz</span>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-dark-900/50 rounded-lg p-3">
                          <p className="text-xs text-dark-500 mb-1">基准频率</p>
                          <p className="font-mono text-white">{record.parameters.baseFrequency} Hz</p>
                        </div>
                        <div className="bg-dark-900/50 rounded-lg p-3">
                          <p className="text-xs text-dark-500 mb-1">观测频率</p>
                          <p className="font-mono text-white">{record.results.observedFrequency.toFixed(1)} Hz</p>
                        </div>
                        <div className="bg-dark-900/50 rounded-lg p-3">
                          <p className="text-xs text-dark-500 mb-1">频率偏移</p>
                          <p className={`font-mono ${
                            record.results.frequencyShift >= 0 ? 'text-primary-400' : 'text-warning-400'
                          }`}>
                            {record.results.frequencyShift >= 0 ? '+' : ''}
                            {record.results.frequencyShift.toFixed(1)} Hz
                          </p>
                        </div>
                        <div className="bg-primary-500/10 rounded-lg p-3 border border-primary-500/30">
                          <p className="text-xs text-primary-300 mb-1">计算速度</p>
                          <p className="font-mono text-primary-400">
                            {record.results.velocity.toFixed(2)} m/s
                          </p>
                        </div>
                      </div>

                      {record.anomalies.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {record.anomalies.slice(0, 3).map((anomaly, index) => (
                            <span
                              key={index}
                              className={`text-xs px-2 py-1 rounded ${
                                anomaly.severity === 'error'
                                  ? 'bg-error-500/10 text-error-400'
                                  : 'bg-warning-500/10 text-warning-400'
                              }`}
                            >
                              {anomaly.message}
                            </span>
                          ))}
                          {record.anomalies.length > 3 && (
                            <span className="text-xs text-dark-500">
                              +{record.anomalies.length - 3} 条更多
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleExportReport(record.id, e)}
                        className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:bg-primary-500/20 hover:text-primary-400 transition-colors"
                        title="导出报告"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteRecord(record.id, e)}
                        className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:bg-error-500/20 hover:text-error-400 transition-colors"
                        title="删除记录"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
