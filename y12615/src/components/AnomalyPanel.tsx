import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ANOMALY_TYPE_LABELS, SEVERITY_COLORS } from '../types';
import { formatDateTime } from '../utils';

interface AnomalyPanelProps {
  onAnomalyClick: (id: string) => void;
}

export default function AnomalyPanel({ onAnomalyClick }: AnomalyPanelProps) {
  const { anomalies, selectedAnomalyId } = useApp();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredAnomalies = anomalies.filter(a => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b space-y-2">
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部严重程度</option>
          <option value="critical">紧急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          <option value="open">待处理</option>
          <option value="in_progress">处理中</option>
          <option value="resolved">已解决</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {filteredAnomalies.map(anomaly => (
          <div
            key={anomaly.id}
            onClick={() => onAnomalyClick(anomaly.id)}
            className={`p-3 border rounded-lg cursor-pointer transition-colors hover:shadow-sm ${
              selectedAnomalyId === anomaly.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[anomaly.severity]}`}>
                {anomaly.severity === 'critical' ? '紧急' : 
                 anomaly.severity === 'high' ? '高' :
                 anomaly.severity === 'medium' ? '中' : '低'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                anomaly.status === 'resolved' ? 'bg-green-100 text-green-700' :
                anomaly.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-red-100 text-red-700'
              }`}>
                {anomaly.status === 'resolved' ? '已解决' :
                 anomaly.status === 'in_progress' ? '处理中' : '待处理'}
              </span>
            </div>

            <div className="text-sm font-medium text-gray-800 mb-1">
              {ANOMALY_TYPE_LABELS[anomaly.type]}
            </div>

            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {anomaly.description}
            </p>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>行号: {anomaly.source.rowNumber}</span>
              {anomaly.source.imageName && (
                <span className="truncate max-w-24">图: {anomaly.source.imageName}</span>
              )}
            </div>

            <div className="text-xs text-gray-400 mt-1">
              {formatDateTime(anomaly.createdAt)}
            </div>
          </div>
        ))}

        {filteredAnomalies.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无异常记录
          </div>
        )}
      </div>
    </div>
  );
}
