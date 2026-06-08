import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { History, User, Calendar, Search, ArrowLeft, Eye } from 'lucide-react';

interface HistoryPageProps {
  onBack?: () => void;
}

export default function HistoryPage({ onBack }: HistoryPageProps) {
  const historyLogs = useAppStore((state) => state.historyLogs);
  const anomalies = useAppStore((state) => state.anomalies);
  const setSelectedAnomaly = useAppStore((state) => state.setSelectedAnomaly);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperator, setFilterOperator] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const uniqueOperators = [...new Set(historyLogs.map((log) => log.operator))];
  const uniqueActions = [...new Set(historyLogs.map((log) => log.action))];

  const filteredLogs = historyLogs.filter((log) => {
    if (filterOperator && log.operator !== filterOperator) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.operator.toLowerCase().includes(searchLower) ||
        log.reason.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.targetId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'add_risk_note':
        return '添加风险备注';
      case 'add_suggestion':
        return '填写处理意见';
      case 'change_status':
        return '修改状态';
      case 'update_status':
        return '更新状态';
      case 'review':
        return '复核确认';
      case 'review_confirm':
        return '复核通过';
      case 'export':
        return '导出记录';
      case 'position_modified':
        return '位置修改';
      default:
        return action;
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
      case 'model_overlap':
        return '模型重叠';
      case 'camera_lost':
        return '相机视角丢失';
      case 'size_exceed':
        return '尺寸超限';
      case 'position_offset':
        return '位置偏移';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'processed':
        return '已处理';
      case 'reviewed':
        return '已复核';
      default:
        return status;
    }
  };

  const getTargetAnomaly = (targetId: string) => {
    return anomalies.find((a) => a.id === targetId);
  };

  const formatStateValue = (state: Record<string, unknown>, key: string) => {
    const value = state[key];
    if (key === 'status') {
      return getStatusLabel(value as string);
    }
    if (typeof value === 'string' && value === '') {
      return '(空)';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  };

  const formatStateLabel = (key: string) => {
    switch (key) {
      case 'riskNote':
        return '风险备注';
      case 'processingSuggestion':
        return '处理意见';
      case 'status':
        return '处理状态';
      default:
        return key;
    }
  };

  const handleViewAnomaly = (targetId: string) => {
    const anomaly = getTargetAnomaly(targetId);
    if (anomaly && onBack) {
      setSelectedAnomaly(anomaly);
      onBack();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </button>
            )}
            <History className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">历史追溯</h2>
          </div>
          <div className="text-sm text-slate-500">
            共 {sortedLogs.length} 条记录
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索操作人、原因、异常ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">操作人</label>
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                {uniqueOperators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">操作类型</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {getActionLabel(action)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <History className="w-16 h-16 mb-4 text-slate-300" />
            <p className="text-lg">暂无历史记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map((log) => {
              const targetAnomaly = getTargetAnomaly(log.targetId);
              const isAnomalyTarget = log.targetType === 'anomaly';
              const hasChangedKeys = Object.keys(log.beforeState).length > 0 || Object.keys(log.afterState).length > 0;
              const changedKeys = Array.from(new Set([
                ...Object.keys(log.beforeState),
                ...Object.keys(log.afterState)
              ]));

              return (
                <div key={log.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{log.operator}</div>
                        <div className="text-sm text-slate-500">
                          {log.operatorRole === 'simulation_engineer' ? '仿真工程师' : '运维人员'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                      log.action === 'review' || log.action === 'review_confirm'
                        ? 'bg-purple-100 text-purple-800'
                        : log.action === 'export'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getActionLabel(log.action)}
                    </span>
                    {targetAnomaly && (
                      <>
                        <span className="text-sm text-slate-600">
                          关联异常：
                          <span className="font-semibold text-slate-800">
                            {getAnomalyTypeLabel(targetAnomaly.type)}
                          </span>
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          targetAnomaly.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : targetAnomaly.severity === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {targetAnomaly.severity === 'high' ? '高危' : targetAnomaly.severity === 'medium' ? '中危' : '低危'}
                        </span>
                        {isAnomalyTarget && onBack && (
                          <button
                            onClick={() => handleViewAnomaly(log.targetId)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            查看异常详情
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                    <div className="text-sm text-slate-700 mb-3">
                      <span className="font-semibold">为什么改：</span>
                      <span className="ml-1">{log.reason}</span>
                    </div>

                    {hasChangedKeys && (
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <div className="text-sm font-semibold text-slate-700 mb-2">变更明细：</div>
                        {changedKeys.map((key) => (
                          <div key={key} className="flex items-start gap-2 text-sm">
                            <span className="font-semibold text-slate-600 min-w-[80px]">
                              {formatStateLabel(key)}:
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">
                                {formatStateValue(log.beforeState as Record<string, unknown>, key)}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded text-green-800">
                                {formatStateValue(log.afterState as Record<string, unknown>, key)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      目标类型: {log.targetType === 'anomaly' ? '异常记录' : '箱位'} | ID: {log.targetId}
                    </span>
                    <span>
                      操作时间: {new Date(log.timestamp).toLocaleString('zh-CN')}
                    </span>
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
