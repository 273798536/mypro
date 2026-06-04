import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Filter, Eye, CheckCircle, ChevronRight, BarChart3 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { anomalyTypeLabels, severityLabels } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { AnomalyType, Severity } from '../types';

export default function AnomaliesPage() {
  const navigate = useNavigate();
  const { anomalies, records, resolveAnomaly } = useAppStore();
  
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(anomaly => {
      if (typeFilter !== 'all' && anomaly.type !== typeFilter) return false;
      if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false;
      if (resolvedFilter === 'resolved' && !anomaly.resolved) return false;
      if (resolvedFilter === 'unresolved' && anomaly.resolved) return false;
      return true;
    });
  }, [anomalies, typeFilter, severityFilter, resolvedFilter]);

  const anomalyStats = useMemo(() => {
    const stats: Record<AnomalyType, { count: number; severity: Severity }> = {
      missing_unit: { count: 0, severity: 'low' },
      color_mismatch: { count: 0, severity: 'medium' },
      coordinate_outlier: { count: 0, severity: 'high' },
      score_abnormal: { count: 0, severity: 'high' },
      layer_occlusion: { count: 0, severity: 'high' },
    };
    
    anomalies.forEach(a => {
      if (!a.resolved) {
        stats[a.type].count++;
      }
    });
    
    return Object.entries(stats).map(([type, data]) => ({
      type,
      name: anomalyTypeLabels[type],
      count: data.count,
      severity: data.severity,
    }));
  }, [anomalies]);

  const getRecordName = (recordId: string) => {
    return records.find(r => r.id === recordId)?.segmentName || '未知岸段';
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
    }
  };

  const getTypeIcon = (type: AnomalyType) => {
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ocean-text">异常数据统计</h2>
              <p className="text-sm text-ocean-textLight">按异常类型分布</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-ocean-text">{anomalies.filter(a => !a.resolved).length}</p>
              <p className="text-xs text-ocean-textLight">待处理</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{anomalies.filter(a => a.resolved).length}</p>
              <p className="text-xs text-ocean-textLight">已解决</p>
            </div>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={anomalyStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip 
                formatter={(value: number) => [`${value} 条`, '异常数量']}
                labelFormatter={(label) => `类型: ${label}`}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {anomalyStats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.severity === 'high' ? '#EF4444' : entry.severity === 'medium' ? '#F59E0B' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ocean-text">异常列表</h2>
              <p className="text-sm text-ocean-textLight">共 {filteredAnomalies.length} 条异常记录</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AnomalyType | 'all')}
            className="px-4 py-2 border border-ocean-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部类型</option>
            {Object.entries(anomalyTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
            className="px-4 py-2 border border-ocean-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部严重程度</option>
            <option value="low">轻微</option>
            <option value="medium">中等</option>
            <option value="high">严重</option>
          </select>

          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value as 'all' | 'resolved' | 'unresolved')}
            className="px-4 py-2 border border-ocean-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部状态</option>
            <option value="unresolved">待处理</option>
            <option value="resolved">已解决</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`p-4 border rounded-lg transition-all hover:shadow-card-hover ${
                anomaly.resolved 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-ocean-border hover:border-primary-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                      {getTypeIcon(anomaly.type)}
                      {anomalyTypeLabels[anomaly.type]}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      anomaly.resolved 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {anomaly.resolved ? '已解决' : '待处理'}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-ocean-text mb-2">
                    {getRecordName(anomaly.recordId)}
                  </h3>
                  
                  <p className="text-sm text-ocean-textLight mb-2">
                    {anomaly.humanReadableReason}
                  </p>
                  
                  <p className="text-xs text-ocean-textLight flex items-center gap-1">
                    来源: {anomaly.sourceMaterial}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {!anomaly.resolved && (
                    <button
                      onClick={() => resolveAnomaly(anomaly.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                      title="标记为已解决"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/detail/${anomaly.recordId}`)}
                    className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-ocean-textLight" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredAnomalies.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-ocean-textLight">暂无符合条件的异常数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
