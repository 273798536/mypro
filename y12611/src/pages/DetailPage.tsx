import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Undo2, Redo2, Clock, User, FileText, 
  MessageSquare, Send, GitCompare, Eye, EyeOff 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { anomalyTypeLabels, severityLabels, dataSourceTypeLabels } from '../data/mockData';
import type { CanvasState } from '../types';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    records, 
    dataSources, 
    processOpinions,
    addProcessOpinion,
    undo,
    redo,
    getCurrentCanvasState,
    getCanvasHistory,
    addCanvasState
  } = useAppStore();
  
  const [opinion, setOpinion] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  const record = records.find(r => r.id === id);
  const source = dataSources.find(s => s.id === record?.sourceId);
  const recordOpinions = processOpinions.filter(o => 
    record?.anomalies.some(a => a.id === o.anomalyId)
  );
  const currentState = id ? getCurrentCanvasState(id) : null;
  const history = id ? getCanvasHistory(id) : [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmitOpinion = () => {
    if (!opinion.trim() || !record) return;
    const anomalyId = record.anomalies[0]?.id;
    if (anomalyId) {
      addProcessOpinion(anomalyId, opinion, '当前用户');
      setOpinion('');
    }
  };

  const handleModifyCanvas = () => {
    if (!id || !currentState) return;
    const newSnapshot = JSON.stringify({
      ...JSON.parse(currentState.snapshot),
      strokeWidth: Math.floor(Math.random() * 3) + 2,
    });
    addCanvasState(id, newSnapshot, '调整描边宽度');
  };

  if (!record) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-ocean-textLight mb-4">未找到该记录</p>
          <button
            onClick={() => navigate('/anomalies')}
            className="text-primary-600 hover:underline"
          >
            返回异常列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/anomalies')}
          className="flex items-center gap-2 text-ocean-textLight hover:text-ocean-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回异常列表
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => undo(id!)}
            className="flex items-center gap-2 px-4 py-2 border border-ocean-border rounded-lg hover:bg-ocean-surface transition-colors"
            disabled={history.length <= 1}
          >
            <Undo2 className="w-4 h-4" />
            撤销
          </button>
          <button
            onClick={() => redo(id!)}
            className="flex items-center gap-2 px-4 py-2 border border-ocean-border rounded-lg hover:bg-ocean-surface transition-colors"
          >
            <Redo2 className="w-4 h-4" />
            重做
          </button>
          <button
            onClick={handleModifyCanvas}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            修改描边
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl font-semibold text-ocean-text">
                {record.segmentName}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    showDiff 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-ocean-surface text-ocean-textLight hover:bg-ocean-border'
                  }`}
                >
                  <GitCompare className="w-4 h-4" />
                  {showDiff ? '隐藏对比' : '显示对比'}
                </button>
              </div>
            </div>

            <div className={`grid gap-4 ${showDiff ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div className="border border-ocean-border rounded-xl overflow-hidden">
                <div className="bg-ocean-surface px-4 py-2 border-b border-ocean-border flex items-center justify-between">
                  <span className="text-sm font-medium text-ocean-text">当前版本</span>
                  {currentState && (
                    <span className="text-xs text-ocean-textLight">
                      v{currentState.version}
                    </span>
                  )}
                </div>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 256">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E4E7EB" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    {currentState && (() => {
                      const config = JSON.parse(currentState.snapshot);
                      return (
                        <path
                          d="M 50 128 Q 100 80 150 128 T 250 128 T 350 128"
                          fill="none"
                          stroke={config.color || '#FF5722'}
                          strokeWidth={config.strokeWidth || 2}
                          strokeLinecap="round"
                          opacity={config.opacity || 0.8}
                        />
                      );
                    })()}
                  </svg>
                  {currentState && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs">
                      <p className="text-ocean-text font-medium">{currentState.description}</p>
                      <p className="text-ocean-textLight">{new Date(currentState.timestamp).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                </div>
              </div>

              {showDiff && (
                <div className="border border-ocean-border rounded-xl overflow-hidden">
                  <div className="bg-ocean-surface px-4 py-2 border-b border-ocean-border flex items-center justify-between">
                    <span className="text-sm font-medium text-ocean-text">历史版本</span>
                    {selectedHistoryIndex !== null && history[selectedHistoryIndex] && (
                      <span className="text-xs text-ocean-textLight">
                        v{history[selectedHistoryIndex].version}
                      </span>
                    )}
                  </div>
                  <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 400 256">
                      <defs>
                        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E4E7EB" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid2)" />
                      {selectedHistoryIndex !== null && history[selectedHistoryIndex] && (() => {
                        const config = JSON.parse(history[selectedHistoryIndex].snapshot);
                        return (
                          <path
                            d="M 50 128 Q 100 80 150 128 T 250 128 T 350 128"
                            fill="none"
                            stroke={config.color || '#FF5722'}
                            strokeWidth={config.strokeWidth || 2}
                            strokeLinecap="round"
                            opacity={config.opacity || 0.8}
                            strokeDasharray="5,5"
                          />
                        );
                      })()}
                    </svg>
                    {selectedHistoryIndex !== null && history[selectedHistoryIndex] && (
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs">
                        <p className="text-ocean-text font-medium">{history[selectedHistoryIndex].description}</p>
                        <p className="text-ocean-textLight">{new Date(history[selectedHistoryIndex].timestamp).toLocaleString('zh-CN')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-ocean-text mb-3">操作历史</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {history.map((state, index) => (
                    <button
                      key={state.id}
                      onClick={() => setSelectedHistoryIndex(index)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs border transition-all ${
                        selectedHistoryIndex === index
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-ocean-border text-ocean-textLight hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {state.operation === 'undo' && <Undo2 className="w-3 h-3" />}
                        {state.operation === 'redo' && <Redo2 className="w-3 h-3" />}
                        {state.operation === 'create' && <span className="text-green-500">●</span>}
                        {state.operation === 'modify' && <span className="text-blue-500">●</span>}
                        <span className="font-medium">v{state.version}</span>
                      </div>
                      <p className="truncate max-w-20">{state.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              <h2 className="font-serif text-xl font-semibold text-ocean-text">处理意见</h2>
            </div>

            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {recordOpinions.length === 0 ? (
                <p className="text-center text-ocean-textLight py-8">暂无处理意见</p>
              ) : (
                recordOpinions.map((op) => (
                  <div key={op.id} className="bg-ocean-surface rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-primary-600" />
                        </div>
                        <span className="text-sm font-medium text-ocean-text">{op.author}</span>
                      </div>
                      <span className="text-xs text-ocean-textLight flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(op.createTime).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-ocean-text">{op.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                placeholder="输入您的处理意见..."
                className="flex-1 px-4 py-3 border border-ocean-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitOpinion()}
              />
              <button
                onClick={handleSubmitOpinion}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                提交
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-primary-600" />
              <h3 className="font-medium text-ocean-text">数据来源</h3>
            </div>
            {source && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-ocean-textLight mb-1">文件名</p>
                  <p className="text-sm text-ocean-text font-medium">{source.fileName}</p>
                </div>
                <div>
                  <p className="text-xs text-ocean-textLight mb-1">材料类型</p>
                  <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                    {dataSourceTypeLabels[source.type]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-ocean-textLight mb-1">上传时间</p>
                  <p className="text-sm text-ocean-text">
                    {new Date(source.uploadTime).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">📊</span>
              <h3 className="font-medium text-ocean-text">基本信息</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-ocean-textLight">岸段名称</span>
                <span className="text-sm text-ocean-text font-medium">{record.segmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ocean-textLight">颜色规则</span>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded" style={{ backgroundColor: record.colorRule }}></span>
                  <span className="text-sm text-ocean-text">{record.colorRule}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ocean-textLight">评分</span>
                <span className="text-sm text-ocean-text font-medium">{record.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ocean-textLight">单位</span>
                <span className={`text-sm ${record.unit ? 'text-ocean-text' : 'text-red-500'}`}>
                  {record.unit || '（缺失）'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-ocean-textLight">备注</span>
                <span className="text-sm text-ocean-text">{record.remark || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">⚠️</span>
              <h3 className="font-medium text-ocean-text">异常信息</h3>
            </div>
            <div className="space-y-3">
              {record.anomalies.map((anomaly) => (
                <div key={anomaly.id} className="p-3 bg-ocean-surface rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                      {severityLabels[anomaly.severity]}
                    </span>
                    <span className="text-xs text-ocean-textLight">
                      {anomalyTypeLabels[anomaly.type]}
                    </span>
                    {anomaly.resolved && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        已解决
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ocean-text mb-2">{anomaly.humanReadableReason}</p>
                  <p className="text-xs text-ocean-textLight">来源: {anomaly.sourceMaterial}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
