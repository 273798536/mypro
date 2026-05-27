import { useFlightStore } from '../store/useFlightStore';
import { X, RotateCcw, Trash2, Clock, MapPin } from 'lucide-react';

interface HistoryPanelProps {
  onClose: () => void;
}

const HistoryPanel = ({ onClose }: HistoryPanelProps) => {
  const { history, restoreFromHistory, clearHistory } = useFlightStore();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (record: any) => {
    if (record.collisionResult?.hasCollision) {
      const hasDanger = record.collisionResult.violations.some((v: any) => v.severity === 'danger');
      return hasDanger ? 'bg-red-600' : 'bg-yellow-600';
    }
    if (record.fuelResult?.isOverLimit) {
      return 'bg-red-600';
    }
    return 'bg-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            历史记录
          </h2>
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空历史
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">暂无历史记录</p>
              <p className="text-slate-500 text-sm mt-1">所有操作将自动保存到历史记录中</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(record)}`} />
                        <span className="text-white font-medium">{record.description}</span>
                        <span className="text-slate-500 text-sm">#{history.length - index}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-2">
                        {formatTimestamp(record.timestamp)}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{record.routeSnapshot.waypoints.length} 个航点</span>
                        </div>
                        {record.fuelResult && (
                          <div className="text-slate-400">
                            距离: {record.fuelResult.totalDistance.toFixed(0)} km | 
                            油耗: {record.fuelResult.totalFuel.toFixed(2)} 吨
                          </div>
                        )}
                        {record.collisionResult && (
                          <div className={record.collisionResult.hasCollision ? 'text-red-400' : 'text-green-400'}>
                            {record.collisionResult.hasCollision
                              ? `${record.collisionResult.violations.length} 项违规`
                              : '无违规'}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        restoreFromHistory(record.id);
                        onClose();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      恢复
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
