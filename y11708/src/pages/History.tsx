import React, { useState } from 'react';
import { History as HistoryIcon, Clock, User, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/common/Card';
import { formatPercent } from '../utils/cn';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const History: React.FC = () => {
  const { history, states } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const clearHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      localStorage.removeItem('markov-retention-storage');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
          <p className="text-gray-500 mt-1">查看所有操作记录和数据变更痕迹</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            清空记录
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="p-12 text-center">
          <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无历史记录</h3>
          <p className="text-gray-500">
            进行预测计算或数据修改后，操作记录将显示在这里
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => {
            const isExpanded = expandedId === record.id;
            const hasPrediction = record.afterData?.prediction;
            const prevPrediction = record.beforeData?.prediction;

            return (
              <Card key={record.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(record.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        {index < history.length - 1 && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{record.action}</h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {record.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(record.timestamp), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {record.operator}
                          </span>
                        </div>
                        {record.remark && (
                          <p className="text-sm text-gray-600 mt-1">{record.remark}</p>
                        )}
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {hasPrediction && (
                    <div className="mt-3 flex gap-4">
                      <div className="px-3 py-1.5 bg-green-50 rounded-lg">
                        <span className="text-xs text-gray-500">活跃率</span>
                        <span className="ml-2 font-medium text-green-600">
                          {formatPercent(record.afterData.prediction.activeRate)}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 bg-red-50 rounded-lg">
                        <span className="text-xs text-gray-500">流失率</span>
                        <span className="ml-2 font-medium text-red-600">
                          {formatPercent(record.afterData.prediction.churnRate)}
                        </span>
                      </div>
                      {prevPrediction && (
                        <div className="px-3 py-1.5 bg-blue-50 rounded-lg">
                          <span className="text-xs text-gray-500">较上次变化</span>
                          <span className={`ml-2 font-medium ${
                            record.afterData.prediction.activeRate >= prevPrediction.activeRate
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {record.afterData.prediction.activeRate >= prevPrediction.activeRate ? '+' : ''}
                            {formatPercent(
                              record.afterData.prediction.activeRate - prevPrediction.activeRate
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {hasPrediction && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-3">状态分布变化</h4>
                          <div className="space-y-2">
                            {states.map((state, i) => {
                              const after = record.afterData.prediction?.predictedDistribution?.[i] || 0;
                              const before = record.beforeData?.prediction?.predictedDistribution?.[i] || 0;
                              const diff = after - before;

                              return (
                                <div key={state.id} className="flex items-center gap-3">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: state.color }}
                                  />
                                  <span className="w-20 text-sm text-gray-600">{state.name}</span>
                                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden flex">
                                    <div
                                      className="h-full bg-gray-400"
                                      style={{ width: `${before * 100}%` }}
                                    />
                                    <div
                                      className="h-full"
                                      style={{
                                        width: `${Math.abs(diff) * 100}%`,
                                        backgroundColor: diff >= 0 ? '#10B981' : '#EF4444',
                                        marginLeft: diff < 0 ? `-${Math.abs(diff) * 100}%` : '0'
                                      }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium w-16 text-right ${
                                    diff >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {diff >= 0 ? '+' : ''}{formatPercent(diff)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium text-gray-700 mb-3">数据详情</h4>
                        <div className="bg-white rounded-lg p-3 overflow-auto max-h-48">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(
                              {
                                timestamp: new Date(record.timestamp).toISOString(),
                                action: record.action,
                                source: record.source,
                                operator: record.operator,
                                dataSummary: {
                                  transitions: record.afterData?.transitions?.length || 0,
                                  hasMatrix: !!record.afterData?.matrix,
                                  hasPrediction: !!record.afterData?.prediction
                                }
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <Card.Header>
          <Card.Title>数据持久化说明</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 所有数据保存在浏览器本地存储 (LocalStorage) 中，不会上传到服务器</p>
            <p>• 清除浏览器缓存或更换设备将导致数据丢失</p>
            <p>• 建议定期导出报告备份重要分析结果</p>
            <p>• 历史记录最多保留100条，超出后自动覆盖最早的记录</p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
