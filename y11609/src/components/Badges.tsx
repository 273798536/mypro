import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { anomalyLabels, anomalyColors, statusLabels, statusColors } from '@/types';
import type { AnomalyType, ClaimStatus } from '@/types';

interface AnomalyBadgeProps {
  type: AnomalyType;
}

export function AnomalyBadge({ type }: AnomalyBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${anomalyColors[type]}`}>
      <AlertTriangle size={12} />
      {anomalyLabels[type]}
    </span>
  );
}

interface AnomalyAlertProps {
  anomalies: AnomalyType[];
  onRecalculate?: () => void;
}

export function AnomalyAlert({ anomalies, onRecalculate }: AnomalyAlertProps) {
  if (anomalies.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-red-700 font-medium">
        <AlertTriangle size={18} />
        检测到 {anomalies.length} 个异常，请关注
      </div>
      <ul className="text-sm text-red-600 space-y-1">
        {anomalies.includes('duplicate_receipt') && (
          <li className="flex items-start gap-2">
            <XCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>票据重复：</strong>存在与其他理赔单相同的票据号，涉嫌重复报销，请核实票据原件
            </span>
          </li>
        )}
        {anomalies.includes('cross_year') && (
          <li className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-yellow-600" />
            <span>
              <strong>跨年度免赔：</strong>票据日期不在保单年度内，请确认免赔规则是否适用
            </span>
          </li>
        )}
        {anomalies.includes('not_recalculated') && (
          <li className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 flex-shrink-0 text-orange-600" />
            <span className="flex items-center gap-2">
              <strong>需重新计算：</strong>
              数据已更新，请重新计算赔付金额
              {onRecalculate && (
                <button
                  onClick={onRecalculate}
                  className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                >
                  立即计算
                </button>
              )}
            </span>
          </li>
        )}
        {anomalies.includes('missing_supplement') && (
          <li className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 flex-shrink-0 text-blue-600" />
            <span>
              <strong>缺少补充材料：</strong>存在待提交的补充材料，请催促申请人尽快提供
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

interface StatusBadgeProps {
  status: ClaimStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
      {status === 'approved' && <CheckCircle size={12} />}
      {status === 'rejected' && <XCircle size={12} />}
      {statusLabels[status]}
    </span>
  );
}

interface SourceBadgeProps {
  source: 'system' | 'manual';
}

export function SourceBadge({ source }: SourceBadgeProps) {
  if (source === 'system') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
        系统导入
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
      人工录入
    </span>
  );
}
