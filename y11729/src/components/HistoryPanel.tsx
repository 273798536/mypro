import React, { useState, useEffect } from 'react';
import { History, Trash2, RotateCcw, Play, ChevronRight } from 'lucide-react';
import { loadHistory, deleteHistoryItem, clearHistory, type HistoryItem } from '../utils/storage';

interface HistoryPanelProps {
  onLoadSimulation: (params: HistoryItem) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onLoadSimulation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(loadHistory());
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setHistory(loadHistory());
  };

  const handleClearAll = () => {
    if (confirm('确定要清除所有历史记录吗？')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleLoad = (item: HistoryItem) => {
    onLoadSimulation(item);
    setIsOpen(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-50 p-3 bg-gray-800/90 backdrop-blur rounded-xl border border-gray-700 hover:bg-gray-700/90 transition-all group"
        title="历史记录"
      >
        <History className="w-5 h-5 text-gray-300 group-hover:text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-96 max-w-full h-full bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">历史记录</h2>
                <span className="text-xs text-gray-500">({history.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="清除全部"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <History className="w-12 h-12 mb-3 opacity-50" />
                  <p>暂无历史记录</p>
                  <p className="text-sm">运行模拟后会自动保存</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                      onClick={() => handleLoad(item)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(item.timestamp)}
                            </span>
                            {item.warnings.length > 0 && (
                              <span className="px-1.5 py-0.5 text-xs bg-amber-600/20 text-amber-400 rounded">
                                {item.warnings.length} 警告
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">初速度:</span>
                              <span className="text-gray-300 ml-1">
                                {item.params.initialVelocity.toFixed(0)}m/s
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">角度:</span>
                              <span className="text-gray-300 ml-1">
                                {item.params.launchAngle.toFixed(0)}°
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">射程误差:</span>
                              <span className="text-amber-400 ml-1">
                                {item.metrics.landingError.toFixed(2)}m
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">靶距:</span>
                              <span className="text-gray-300 ml-1">
                                {item.params.targetDistance.toFixed(0)}m
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all"
                            title="加载此参数"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                最多保存 20 条记录
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
