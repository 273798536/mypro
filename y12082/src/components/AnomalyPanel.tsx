import { useState } from 'react';
import { AlertTriangle, Lock, XCircle, AlertCircle, FileWarning, CheckCircle, Eye, Filter } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AnomalyType } from '../types';

const AnomalyPanel = () => {
  const { anomalies, resolveAnomaly, setSelectedEdge, setSelectedNode, edges, nodes } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<AnomalyType | 'all'>('all');
  const [showResolved, setShowResolved] = useState(false);
  
  const getAnomalyIcon = (type: AnomalyType) => {
    switch (type) {
      case 'access_failed': return <Lock className="w-5 h-5" />;
      case 'path_closed': return <XCircle className="w-5 h-5" />;
      case 'floor_mismatch': return <AlertCircle className="w-5 h-5" />;
      case 'bad_row': return <FileWarning className="w-5 h-5" />;
      case 'missing_data': return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };
  
  const getAnomalyColor = (type: AnomalyType) => {
    switch (type) {
      case 'access_failed': return 'text-amber-400 bg-amber-900/30 border-amber-700/50';
      case 'path_closed': return 'text-red-400 bg-red-900/30 border-red-700/50';
      case 'floor_mismatch': return 'text-orange-400 bg-orange-900/30 border-orange-700/50';
      case 'bad_row': return 'text-purple-400 bg-purple-900/30 border-purple-700/50';
      case 'missing_data': return 'text-pink-400 bg-pink-900/30 border-pink-700/50';
      default: return 'text-slate-400 bg-slate-900/30 border-slate-700/50';
    }
  };
  
  const getAnomalyLabel = (type: AnomalyType) => {
    const labels: Record<AnomalyType, string> = {
      access_failed: '门禁失效',
      path_closed: '通道封闭',
      floor_mismatch: '楼层错配',
      bad_row: '坏行数据',
      missing_data: '数据缺失'
    };
    return labels[type] || type;
  };
  
  const filteredAnomalies = anomalies.filter(a => {
    if (!showResolved && a.resolved) return false;
    if (activeFilter !== 'all' && a.type !== activeFilter) return false;
    return true;
  });
  
  const anomalyStats = {
    total: anomalies.length,
    unresolved: anomalies.filter(a => !a.resolved).length,
    access_failed: anomalies.filter(a => a.type === 'access_failed' && !a.resolved).length,
    path_closed: anomalies.filter(a => a.type === 'path_closed' && !a.resolved).length,
    bad_row: anomalies.filter(a => a.type === 'bad_row' && !a.resolved).length,
    missing_data: anomalies.filter(a => a.type === 'missing_data' && !a.resolved).length,
  };
  
  const handleLocate = (anomaly: typeof anomalies[0]) => {
    if (anomaly.pathId) {
      setSelectedEdge(anomaly.pathId);
    }
    if (anomaly.nodeId) {
      setSelectedNode(anomaly.nodeId);
    }
  };
  
  return (
    <div className="bg-slate-900/95 backdrop-blur border-t border-slate-700 text-white">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="font-semibold">异常数据复核</h3>
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
            {anomalyStats.unresolved} 待处理
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-3 h-3"
            />
            显示已解决
          </label>
        </div>
      </div>
      
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">筛选类型：</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              activeFilter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            全部 ({anomalyStats.unresolved})
          </button>
          <button
            onClick={() => setActiveFilter('access_failed')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              activeFilter === 'access_failed' 
                ? 'bg-amber-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Lock className="w-3 h-3" />
            门禁失效 ({anomalyStats.access_failed})
          </button>
          <button
            onClick={() => setActiveFilter('path_closed')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              activeFilter === 'path_closed' 
                ? 'bg-red-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <XCircle className="w-3 h-3" />
            通道封闭 ({anomalyStats.path_closed})
          </button>
          <button
            onClick={() => setActiveFilter('bad_row')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              activeFilter === 'bad_row' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <FileWarning className="w-3 h-3" />
            坏行 ({anomalyStats.bad_row})
          </button>
          <button
            onClick={() => setActiveFilter('missing_data')}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              activeFilter === 'missing_data' 
                ? 'bg-pink-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            数据缺失 ({anomalyStats.missing_data})
          </button>
        </div>
      </div>
      
      <div className="p-3 max-h-48 overflow-y-auto space-y-2">
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">暂无异常数据</p>
          </div>
        ) : (
          filteredAnomalies.map(anomaly => (
            <div
              key={anomaly.id}
              className={`border rounded-lg p-3 ${getAnomalyColor(anomaly.type)} ${
                anomaly.resolved ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  {getAnomalyIcon(anomaly.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {getAnomalyLabel(anomaly.type)}
                      </span>
                      {anomaly.source && (
                        <span className="text-xs opacity-70">
                          来源: {anomaly.source}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1 opacity-90">
                      {anomaly.description}
                    </p>
                    {anomaly.rawData && (
                      <div className="mt-2 bg-black/30 rounded p-2 font-mono text-xs overflow-x-auto">
                        原始数据: {anomaly.rawData}
                      </div>
                    )}
                    {(anomaly.pathId || anomaly.nodeId) && (
                      <div className="mt-1 text-xs opacity-70">
                        {anomaly.pathId && edges.find(e => e.id === anomaly.pathId) && (
                          <span>通道: {edges.find(e => e.id === anomaly.pathId)?.description} </span>
                        )}
                        {anomaly.nodeId && nodes.find(n => n.id === anomaly.nodeId) && (
                          <span>位置: {nodes.find(n => n.id === anomaly.nodeId)?.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(anomaly.pathId || anomaly.nodeId) && (
                    <button
                      onClick={() => handleLocate(anomaly)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="在3D视图中定位"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {!anomaly.resolved && (
                    <button
                      onClick={() => resolveAnomaly(anomaly.id)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title="标记为已解决"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnomalyPanel;
