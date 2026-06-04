import { useApp } from '../context/AppContext';
import { STATUS_LABELS, STATUS_COLORS, ANOMALY_TYPE_LABELS, SEVERITY_COLORS } from '../types';
import { formatDateTime } from '../utils';

interface DetailModalProps {
  recordId: string | null;
  anomalyId: string | null;
  onClose: () => void;
}

export default function DetailModal({ recordId, anomalyId, onClose }: DetailModalProps) {
  const { scoreRecords, anomalies, resolveAnomaly } = useApp();

  const record = recordId ? scoreRecords.find(r => r.id === recordId) : null;
  const anomaly = anomalyId ? anomalies.find(a => a.id === anomalyId) : null;

  const recordAnomalies = record ? anomalies.filter(a => a.scoreRecordId === record.id) : [];

  const handleResolve = () => {
    if (anomaly) {
      resolveAnomaly(anomaly.id, '当前用户');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {record ? '记录详情' : anomaly ? '异常详情' : '详情'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {record && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">装置名称</label>
                    <p className="font-medium text-gray-900">{record.deviceName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">类别</label>
                    <p className="text-gray-700">{record.category}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">颜色标注</label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: record.colorCode }}
                      />
                      <span className="text-gray-700">{record.colorCode}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">得分</label>
                    <p className={`font-medium ${
                      record.score >= 80 ? 'text-green-600' : 
                      record.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {record.score} / {record.maxScore}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">状态</label>
                    <p>
                      <span className={`px-2 py-1 rounded text-sm font-medium border ${STATUS_COLORS[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">处理人</label>
                    <p className="text-gray-700">{record.handler}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">来源信息</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">原始行号</span>
                    <p className="font-mono font-medium text-gray-900">{record.source.rowNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">图片名</span>
                    <p className="font-mono text-gray-700">{record.source.imageName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">来源图层</span>
                    <p className="text-gray-700">{record.source.sourceLayer || '-'}</p>
                  </div>
                </div>
                {record.source.remark && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">备注</span>
                    <p className="text-gray-700 mt-1">{record.source.remark}</p>
                  </div>
                )}
              </div>

              {recordAnomalies.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                    关联异常 ({recordAnomalies.length})
                  </h3>
                  <div className="space-y-3">
                    {recordAnomalies.map(a => (
                      <div key={a.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[a.severity]}`}>
                            {a.severity === 'critical' ? '紧急' : 
                             a.severity === 'high' ? '高' :
                             a.severity === 'medium' ? '中' : '低'}
                          </span>
                          <span className={`text-xs ${
                            a.status === 'resolved' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {a.status === 'resolved' ? '已解决' :
                             a.status === 'in_progress' ? '处理中' : '待处理'}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800">{ANOMALY_TYPE_LABELS[a.type]}</p>
                        <p className="text-sm text-gray-600 mt-1">{a.description}</p>
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                          <span className="font-medium text-yellow-800">处理建议：</span>
                          <span className="text-yellow-700">{a.suggestion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {record.reviewComment && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-700 mb-1">审核意见</h3>
                  <p className="text-blue-800">{record.reviewComment}</p>
                  {record.reviewTime && (
                    <p className="text-xs text-blue-600 mt-2">{formatDateTime(record.reviewTime)}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {anomaly && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm font-medium ${SEVERITY_COLORS[anomaly.severity]}`}>
                  {anomaly.severity === 'critical' ? '紧急' : 
                   anomaly.severity === 'high' ? '高' :
                   anomaly.severity === 'medium' ? '中' : '低'}
                </span>
                <span className={`px-3 py-1 rounded text-sm ${
                  anomaly.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  anomaly.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {anomaly.status === 'resolved' ? '已解决' :
                   anomaly.status === 'in_progress' ? '处理中' : '待处理'}
                </span>
              </div>

              <div>
                <label className="text-xs text-gray-500">异常类型</label>
                <p className="text-lg font-semibold text-gray-900">
                  {ANOMALY_TYPE_LABELS[anomaly.type]}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500">问题描述</label>
                <p className="text-gray-700 mt-1">{anomaly.description}</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">处理建议</h3>
                <p className="text-yellow-700">{anomaly.suggestion}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">来源追溯</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">原始行号</span>
                    <p className="font-mono font-medium text-gray-900">{anomaly.source.rowNumber}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">图片名</span>
                    <p className="font-mono text-gray-700">{anomaly.source.imageName || '-'}</p>
                  </div>
                </div>
                {anomaly.source.remark && (
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">备注</span>
                    <p className="text-gray-700 mt-1">{anomaly.source.remark}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-500">创建时间</span>
                  <p className="text-gray-700">{formatDateTime(anomaly.createdAt)}</p>
                </div>
                {anomaly.resolvedAt && (
                  <div>
                    <span className="text-xs text-gray-500">解决时间</span>
                    <p className="text-gray-700">{formatDateTime(anomaly.resolvedAt)}</p>
                  </div>
                )}
                {anomaly.resolver && (
                  <div>
                    <span className="text-xs text-gray-500">处理人</span>
                    <p className="text-gray-700">{anomaly.resolver}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          {anomaly && anomaly.status !== 'resolved' && (
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              标记已解决
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
