import { useState } from 'react';
import { AlertCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, FileText, User } from 'lucide-react';
import { Anomaly, ComplaintRecord, RawDataReference } from '../types';
import { Card, SectionHeader, Badge, Button } from './ui';

interface AnomalyPanelProps {
  anomalies: Anomaly[];
  complaints: ComplaintRecord[];
  onMarkResolved?: (anomalyId: string) => void;
}

const anomalyTypeLabels: Record<string, string> = {
  wrong_intersection: '路口错误',
  duplicate_complaint: '重复投诉',
  bad_data: '坏数据',
  version_conflict: '版本冲突',
  late_attachment: '晚到附件',
  data_inconsistency: '数据不一致',
};

const severityConfig = {
  critical: { icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  error: { icon: <AlertCircle className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  warning: { icon: <AlertTriangle className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

export function AnomalyPanel({ anomalies, complaints, onMarkResolved }: AnomalyPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const unresolvedAnomalies = anomalies.filter(a => !resolvedIds.has(a.id));
  const resolvedAnomalies = anomalies.filter(a => resolvedIds.has(a.id));

  const handleMarkResolved = (id: string) => {
    setResolvedIds(prev => new Set(prev).add(id));
    onMarkResolved?.(id);
  };

  const getRelatedComplaints = (anomaly: Anomaly) => {
    return complaints.filter(c => anomaly.relatedRecordIds.includes(c.id));
  };

  const renderRawReference = (ref: RawDataReference) => (
    <div className="text-xs bg-gray-100 rounded p-2 font-mono">
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        <FileText className="w-3 h-3" />
        <span>来源：{ref.source}</span>
        {ref.lineNumber && <span>· 第{ref.lineNumber}行</span>}
        {ref.fieldName && <span>· 字段：{ref.fieldName}</span>}
      </div>
      <div className="text-gray-800">原值："{ref.originalValue}"</div>
    </div>
  );

  const renderAnomalyCard = (anomaly: Anomaly, isResolved: boolean) => {
    const isExpanded = expandedId === anomaly.id;
    const config = severityConfig[anomaly.severity];
    const relatedComplaints = getRelatedComplaints(anomaly);

    return (
      <div
        key={anomaly.id}
        className={`border rounded-lg overflow-hidden ${config.border} ${isResolved ? 'opacity-60' : ''}`}
      >
        <div
          className={`p-4 cursor-pointer hover:${config.bg} transition-colors ${config.bg}`}
          onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={config.color}>{config.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{anomaly.title}</span>
                  <Badge severity={anomaly.severity === 'critical' ? 'error' : anomaly.severity === 'error' ? 'warning' : 'info'}>
                    {anomalyTypeLabels[anomaly.type] || anomaly.type}
                  </Badge>
                  {anomaly.requiresManualReview && (
                    <Badge severity="error">需人工确认</Badge>
                  )}
                  {isResolved && (
                    <Badge severity="success">已处理</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">处理建议</h5>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  💡 {anomaly.suggestion}
                </p>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">关联记录</h5>
                {relatedComplaints.length > 0 ? (
                  <div className="space-y-2">
                    {relatedComplaints.slice(0, 3).map(c => (
                      <div key={c.id} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{c.street}</span>
                          {c.intersection && <span className="text-gray-500">· {c.intersection}</span>}
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5">{c.description.slice(0, 40)}...</p>
                      </div>
                    ))}
                    {relatedComplaints.length > 3 && (
                      <p className="text-xs text-gray-500">还有{relatedComplaints.length - 3}条记录</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">无关联投诉记录</p>
                )}
              </div>
            </div>

            {anomaly.rawReferences.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">原始数据溯源</h5>
                <div className="space-y-2">
                  {anomaly.rawReferences.map((ref, idx) => (
                    <div key={idx}>{renderRawReference(ref)}</div>
                  ))}
                </div>
              </div>
            )}

            {!isResolved && anomaly.requiresManualReview && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkResolved(anomaly.id);
                  }}
                >
                  标记为已处理
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="异常检测"
        icon={<AlertCircle className="w-5 h-5 text-red-500" />}
        description="系统自动识别数据中的异常问题，需人工确认后才能继续"
        badge={
          <div className="flex gap-1">
            {unresolvedAnomalies.length > 0 && (
              <Badge severity="error">{unresolvedAnomalies.length}个待处理</Badge>
            )}
            {resolvedAnomalies.length > 0 && (
              <Badge severity="success">{resolvedAnomalies.length}个已处理</Badge>
            )}
          </div>
        }
      />

      {anomalies.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
          <p className="text-green-600 font-medium">未检测到异常数据</p>
          <p className="text-sm">所有数据格式正确、内容完整</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unresolvedAnomalies.map(a => renderAnomalyCard(a, false))}
          {resolvedAnomalies.map(a => renderAnomalyCard(a, true))}
        </div>
      )}
    </Card>
  );
}
