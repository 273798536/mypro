import { History, GitCompare, Trash2, Download } from 'lucide-react';
import { useTheaterStore } from '@/store/theaterStore';

export function HistoryPanel() {
  const history = useTheaterStore((state) => state.history);
  const currentVersionId = useTheaterStore((state) => state.currentVersionId);
  const compareVersionId = useTheaterStore((state) => state.compareVersionId);
  
  const loadVersion = useTheaterStore((state) => state.loadVersion);
  const setCompareVersion = useTheaterStore((state) => state.setCompareVersion);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theater-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-theater-dark border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <h3 className="text-theater-gold font-display text-lg font-semibold flex items-center gap-2">
          <History size={18} />
          历史版本
        </h3>
        <button
          onClick={handleExport}
          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
          title="导出历史记录"
        >
          <Download size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            <History size={32} className="mx-auto mb-2 opacity-50" />
            <p>暂无历史记录</p>
            <p className="text-xs mt-1">运行检测后点击"保存版本"创建</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {[...history].reverse().map((version) => (
              <div
                key={version.id}
                className={`p-3 hover:bg-gray-800/50 transition-colors cursor-pointer ${
                  currentVersionId === version.id ? 'bg-theater-gold/10 border-l-2 border-theater-gold' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => loadVersion(version.id)}>
                    <h4 className="text-white font-medium text-sm truncate">
                      {version.name}
                    </h4>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatDate(version.timestamp)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-gray-400">
                        座位: {version.results.totalSeats || '-'}
                      </span>
                      <span className={`${
                        (version.results.blockedSeats || 0) > 0 
                          ? 'text-theater-red' 
                          : 'text-theater-success'
                      }`}>
                        受阻: {version.results.blockedSeats || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareVersion(compareVersionId === version.id ? null : version.id);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        compareVersionId === version.id
                          ? 'bg-theater-gold text-black'
                          : 'hover:bg-gray-700 text-gray-400'
                      }`}
                      title="对比版本"
                    >
                      <GitCompare size={14} />
                    </button>
                  </div>
                </div>
                {version.description && (
                  <p className="text-gray-500 text-xs mt-2 italic">
                    {version.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {compareVersionId && (
        <div className="p-3 bg-theater-gold/10 border-t border-theater-gold/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-theater-gold">正在对比版本</span>
            <button
              onClick={() => setCompareVersion(null)}
              className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
            >
              <Trash2 size={12} />
              取消对比
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
