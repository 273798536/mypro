import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CadRecord, AnomalyPoint, TimelineGap } from '../../types';
import { useDataStore } from '../../store/dataStore';
import { PROCESS_STATUS_OPTIONS, ANOMALY_TYPE_OPTIONS, COLORS } from '../../utils/constants';
import { formatTimestamp, getAnomalyTypeLabel } from '../../utils/dataProcessor';
import { X, ExternalLink, FileText, Database, Clock, AlertTriangle, MapPin } from 'lucide-react';

interface TracePanelProps {
  gaps: TimelineGap[];
}

export const TracePanel = ({ gaps }: TracePanelProps) => {
  const navigate = useNavigate();
  const selectedRecordId = useDataStore((s) => s.selectedRecordId);
  const selectedAnomalyId = useDataStore((s) => s.selectedAnomalyId);
  const records = useDataStore((s) => s.records);
  const anomalies = useDataStore((s) => s.anomalies);
  const setSelectedRecord = useDataStore((s) => s.setSelectedRecord);
  const setSelectedAnomaly = useDataStore((s) => s.setSelectedAnomaly);

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId);
  }, [records, selectedRecordId]);

  const selectedAnomaly = useMemo(() => {
    return anomalies.find((a) => a.id === selectedAnomalyId);
  }, [anomalies, selectedAnomalyId]);

  const recordAnomalies = useMemo(() => {
    if (!selectedRecordId) return [];
    return anomalies.filter((a) => a.recordId === selectedRecordId);
  }, [anomalies, selectedRecordId]);

  const relatedGap = useMemo(() => {
    if (!selectedRecordId) return null;
    return gaps.find((g) => g.affectedRecordIds.includes(selectedRecordId));
  }, [gaps, selectedRecordId]);

  const getStatusInfo = (status: string) => {
    return PROCESS_STATUS_OPTIONS.find((o) => o.value === status) || {
      label: status,
      color: 'bg-gray-500',
    };
  };

  const getAnomalyColor = (type: string) => {
    const option = ANOMALY_TYPE_OPTIONS.find((o) => o.value === type);
    return option ? option.color : 'text-gray-400';
  };

  const handleViewCsvDetail = () => {
    if (selectedRecord) {
      navigate(`/csv?row=${selectedRecord.rowNumber}`);
    } else {
      navigate('/csv');
    }
  };

  const handleClose = () => {
    setSelectedRecord(null);
    setSelectedAnomaly(null);
  };

  if (!selectedRecord && !selectedAnomaly) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 p-6">
        <div className="text-center">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">点击图表中的数据点或异常标记</p>
          <p className="text-xs mt-1">查看来源信息和处理状态</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="font-medium text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          异常追溯
        </h3>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedRecord && (
          <div className="space-y-3">
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">记录ID</span>
                <span className="text-sm font-mono text-blue-400">{selectedRecord.id}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  坐标
                </span>
                <span className="text-sm text-slate-200 font-mono">
                  ({selectedRecord.x.toFixed(1)}, {isNaN(selectedRecord.y) ? '-' : selectedRecord.y.toFixed(1)})
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  时间
                </span>
                <span className="text-sm text-slate-200">
                  {formatTimestamp(selectedRecord.timestamp)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">图层</span>
                <span className="text-sm text-slate-200">{selectedRecord.layer}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">原始行号</span>
                <span className="text-sm font-mono text-yellow-400">#{selectedRecord.rowNumber}</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-blue-400 flex items-center gap-1 font-medium">
                  <Database className="w-3 h-3" />
                  来源 (强制保留)
                </span>
                <span className="text-sm text-blue-200 font-medium">
                  {selectedRecord.source}
                </span>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-green-400 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  处理状态 (强制保留)
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusInfo(selectedRecord.processStatus).color}`}
                  />
                  <span className="text-sm text-green-200 font-medium">
                    {getStatusInfo(selectedRecord.processStatus).label}
                  </span>
                </div>
              </div>
            </div>

            {Object.keys(selectedRecord.originalFields).length > 0 && (
              <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-700">
                <div className="text-xs text-slate-400 mb-2 font-medium">原始CAD字段</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(selectedRecord.originalFields).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-slate-500">{key}</span>
                      <span className="text-slate-300 font-mono">
                        {String(value) || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleViewCsvDetail}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              查看CSV明细 (定位行 #{selectedRecord.rowNumber})
            </button>
          </div>
        )}

        {recordAnomalies.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-medium">关联异常 ({recordAnomalies.length})</div>
            {recordAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAnomalyId === anomaly.id
                    ? 'bg-red-500/20 border-red-500/50'
                    : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                }`}
                onClick={() => setSelectedAnomaly(anomaly.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${getAnomalyColor(anomaly.type)}`}>
                    {getAnomalyTypeLabel(anomaly.type)}
                  </span>
                  <span className="text-xs text-slate-500">{anomaly.id}</span>
                </div>
                <p className="text-sm text-slate-300">{anomaly.description}</p>
              </div>
            ))}
          </div>
        )}

        {selectedAnomaly && (
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600">
            <div className="text-xs text-slate-400 mb-2 font-medium">异常来源信息快照</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">数据来源</span>
                <span className="text-blue-400">{selectedAnomaly.sourceInfo.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">处理状态</span>
                <span className="text-green-400">{selectedAnomaly.sourceInfo.processStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">影响范围</span>
                <span className="text-slate-300">{selectedAnomaly.affectedRange.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {relatedGap && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">关联时间轴缺段</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">缺段ID</span>
                <span className="text-purple-400">{relatedGap.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">持续时间</span>
                <span className="text-purple-300">{relatedGap.duration} 分钟</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">影响行号</span>
                <span className="text-yellow-400">
                  {relatedGap.startRow} - {relatedGap.endRow}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
