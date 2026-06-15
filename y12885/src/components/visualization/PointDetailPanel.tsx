import { useState } from 'react';
import { X, MapPin, Clock, Ship, Gauge, Navigation, Edit3, Save, RotateCcw, History } from 'lucide-react';
import { useAppStore } from '../../store';
import { StatusBadge } from '../StatusBadge';
import { formatDateTime } from '../../mock/data';
import { TrackPoint } from '../../types';

export default function PointDetailPanel() {
  const { selectedTrackPoint, setSelectedTrackPoint, updateTrackPoint, getTrackPointAnomalies, getVersionHistory } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<TrackPoint>>({});
  const [showHistory, setShowHistory] = useState(false);

  if (!selectedTrackPoint) return null;

  const anomalies = getTrackPointAnomalies(selectedTrackPoint.id);
  const versionHistory = getVersionHistory('track', selectedTrackPoint.id);

  const handleEdit = () => {
    setEditValues({
      depth: selectedTrackPoint.depth,
      longitude: selectedTrackPoint.longitude,
      latitude: selectedTrackPoint.latitude,
      speed: selectedTrackPoint.speed,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateTrackPoint(selectedTrackPoint.id, editValues);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  const handleInputChange = (field: keyof TrackPoint, value: number) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-80 glass-panel h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-ocean-700/50 flex items-center justify-between">
        <h3 className="font-medium text-ocean-100">轨迹点详情</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded transition-colors ${
              showHistory ? 'bg-ocean-500 text-white' : 'text-ocean-400 hover:text-ocean-200 hover:bg-ocean-800'
            }`}
            title="查看历史版本"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedTrackPoint(null)}
            className="p-1.5 text-ocean-400 hover:text-ocean-200 hover:bg-ocean-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-ocean-400" />
            <span className="text-sm font-medium text-ocean-100">{selectedTrackPoint.shipName}</span>
          </div>
          <StatusBadge status={selectedTrackPoint.dataQuality} type="data-quality" />
        </div>

        {!showHistory ? (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-ocean-900/50 rounded-lg">
                <MapPin className="w-4 h-4 text-ocean-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ocean-400 mb-1">坐标位置</p>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-ocean-500">经度</label>
                          <input
                            type="number"
                            step="0.0001"
                            className="input-field text-xs mt-0.5"
                            value={editValues.longitude}
                            onChange={(e) => handleInputChange('longitude', Number(e.target.value))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-ocean-500">纬度</label>
                          <input
                            type="number"
                            step="0.0001"
                            className="input-field text-xs mt-0.5"
                            value={editValues.latitude}
                            onChange={(e) => handleInputChange('latitude', Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-mono text-ocean-200">
                      {selectedTrackPoint.longitude.toFixed(4)}°E, {selectedTrackPoint.latitude.toFixed(4)}°N
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-ocean-900/50 rounded-lg">
                <Gauge className="w-4 h-4 text-ocean-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ocean-400 mb-1">深度</p>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      className="input-field text-xs"
                      value={editValues.depth}
                      onChange={(e) => handleInputChange('depth', Number(e.target.value))}
                    />
                  ) : (
                    <p className={`text-sm font-mono ${selectedTrackPoint.depth < 0 ? 'text-data-recollect' : 'text-ocean-200'}`}>
                      {selectedTrackPoint.depth.toFixed(2)} m
                      {selectedTrackPoint.depth < 0 && <span className="text-xs ml-1">(异常)</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 bg-ocean-900/50 rounded-lg">
                  <Navigation className="w-4 h-4 text-ocean-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ocean-400 mb-1">航速</p>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        className="input-field text-xs"
                        value={editValues.speed}
                        onChange={(e) => handleInputChange('speed', Number(e.target.value))}
                      />
                    ) : (
                      <p className="text-sm font-mono text-ocean-200">{selectedTrackPoint.speed.toFixed(1)} 节</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-ocean-900/50 rounded-lg">
                  <Navigation className="w-4 h-4 text-ocean-400 mt-0.5 flex-shrink-0 rotate-45" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ocean-400 mb-1">航向</p>
                    <p className="text-sm font-mono text-ocean-200">{selectedTrackPoint.heading}°</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-ocean-900/50 rounded-lg">
                <Clock className="w-4 h-4 text-ocean-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ocean-400 mb-1">采集时间</p>
                  <p className="text-sm font-mono text-ocean-200">{formatDateTime(selectedTrackPoint.timestamp)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-ocean-300">元数据</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ocean-400">数据来源</span>
                  <span className="text-ocean-200 font-mono">{selectedTrackPoint.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ocean-400">版本号</span>
                  <span className="text-ocean-200 font-mono">v{selectedTrackPoint.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ocean-400">创建时间</span>
                  <span className="text-ocean-200 font-mono">{formatDateTime(selectedTrackPoint.createdAt).slice(5, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ocean-400">更新时间</span>
                  <span className="text-ocean-200 font-mono">{formatDateTime(selectedTrackPoint.updatedAt).slice(5, 16)}</span>
                </div>
              </div>
            </div>

            {anomalies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ocean-300">关联异常 ({anomalies.length})</p>
                <div className="space-y-2">
                  {anomalies.map(anomaly => (
                    <div key={anomaly.id} className="p-3 bg-data-recollect/10 border border-data-recollect/30 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <StatusBadge status={anomaly.severity} type="severity" />
                        <span className={`text-xs ${anomaly.resolved ? 'text-data-available' : 'text-data-recollect'}`}>
                          {anomaly.resolved ? '已解决' : '未解决'}
                        </span>
                      </div>
                      <p className="text-xs text-ocean-200">{anomaly.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="btn-success flex-1 text-sm flex items-center justify-center gap-1">
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                  <button onClick={handleCancel} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1">
                    <RotateCcw className="w-4 h-4" />
                    取消
                  </button>
                </>
              ) : (
                <button onClick={handleEdit} className="btn-primary w-full text-sm flex items-center justify-center gap-1">
                  <Edit3 className="w-4 h-4" />
                  人工修正
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-ocean-300">版本历史</p>
            {versionHistory.length > 0 ? (
              <div className="space-y-3">
                {versionHistory.map((record, index) => (
                  <div key={record.id} className="relative pl-6 pb-4 border-l border-ocean-700/50 last:pb-0">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-ocean-500 border-2 border-ocean-900" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ocean-100">{record.changeType}</span>
                        <span className="text-xs text-ocean-400">{formatDateTime(record.timestamp).slice(5, 16)}</span>
                      </div>
                      <p className="text-xs text-ocean-300">{record.operatorName}</p>
                      {record.remark && <p className="text-xs text-ocean-400">{record.remark}</p>}
                      {record.before && record.after && (
                        <div className="bg-ocean-900/50 rounded p-2 space-y-1">
                          {Object.entries(record.before).map(([field, oldValue], idx) => {
                            const newValue = record.after[field];
                            return (
                              <div key={idx} className="text-xs flex justify-between">
                                <span className="text-ocean-400">{field}</span>
                                <span className="font-mono">
                                  <span className="text-data-recollect line-through">{String(oldValue)}</span>
                                  <span className="text-ocean-400 mx-1">→</span>
                                  <span className="text-data-available">{String(newValue)}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ocean-400 text-center py-4">暂无历史版本记录</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
