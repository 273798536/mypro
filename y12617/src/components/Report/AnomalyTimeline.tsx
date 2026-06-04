import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { AnnotationTypeBadge } from '../ui/Badge';
import { AlertTriangle, Clock, User } from 'lucide-react';
import type { AnomalyItem } from '../../types/report';
import { formatTime } from '../../utils/time';

interface AnomalyTimelineProps {
  anomalies: AnomalyItem[];
  onSelectAnomaly?: (anomaly: AnomalyItem) => void;
  selectedAnomalyId?: string;
}

export const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({
  anomalies,
  onSelectAnomaly,
  selectedAnomalyId,
}) => {
  const sortedAnomalies = [...anomalies].sort((a, b) => a.timePoint - b.timePoint);

  const getSeverityColor = (severity: AnomalyItem['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-accent-orange';
      case 'low':
        return 'bg-yellow-500';
    }
  };

  const getSeverityLabel = (severity: AnomalyItem['severity']) => {
    switch (severity) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
    }
  };

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-neutral-800">异常时间线</h3>
              <p className="text-sm text-neutral-500">本次检测未发现异常标注</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-neutral-500">
            <p>🎉 所有标注均为正常状态</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-neutral-800">异常时间线</h3>
              <p className="text-sm text-neutral-500">共发现 {anomalies.length} 条异常记录</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              高
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-orange" />
              中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              低
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200" />

          <div className="space-y-4">
            {sortedAnomalies.map((anomaly, index) => (
              <div
                key={anomaly.id}
                onClick={() => onSelectAnomaly?.(anomaly)}
                className={`relative pl-10 cursor-pointer transition-all ${
                  selectedAnomalyId === anomaly.id
                    ? 'scale-[1.01]'
                    : 'hover:scale-[1.005]'
                }`}
              >
                <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 border-white z-10 shadow-md">
                  <div className={`w-full h-full rounded-full ${getSeverityColor(anomaly.severity)}`} />
                </div>

                <div
                  className={`p-4 rounded-xl border transition-all ${
                    selectedAnomalyId === anomaly.id
                      ? 'border-primary-300 bg-primary-50 shadow-md'
                      : 'border-neutral-200 bg-white hover:border-primary-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <AnnotationTypeBadge type={anomaly.type} />
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          anomaly.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : anomaly.severity === 'medium'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          严重程度：{getSeverityLabel(anomaly.severity)}
                        </span>
                      </div>

                      <p className="font-medium text-neutral-800 mb-1">{anomaly.description}</p>
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {anomaly.annotationContent}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          时间点：{formatTime(anomaly.timePoint)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          处理记录：{anomaly.processNotes.length} 条
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-mono text-neutral-400">
                        #{String(index + 1).padStart(3, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
