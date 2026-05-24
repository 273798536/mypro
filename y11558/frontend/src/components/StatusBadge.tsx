import React from 'react';
import type { ChainStatus, DirtyDataStatus, MaterialType } from '../types';

interface StatusBadgeProps {
  status: ChainStatus | DirtyDataStatus;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700', label: '待处理' },
  PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-700', label: '处理中' },
  EXCEPTION: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
  RECONCILING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '对账中' },
  REVIEW_REQUIRED: { bg: 'bg-orange-100', text: 'text-orange-700', label: '待复核' },
  RECONCILED: { bg: 'bg-green-100', text: 'text-green-700', label: '已对账' },
  EXPORTED: { bg: 'bg-purple-100', text: 'text-purple-700', label: '已导出' },
  FIXED: { bg: 'bg-green-100', text: 'text-green-700', label: '已修正' },
  IGNORED: { bg: 'bg-gray-100', text: 'text-gray-500', label: '已忽略' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

interface MaterialTypeBadgeProps {
  type: MaterialType;
}

const materialTypeConfig: Record<MaterialType, { bg: string; text: string; label: string }> = {
  ORDER: { bg: 'bg-blue-100', text: 'text-blue-700', label: '订单' },
  TRACK: { bg: 'bg-green-100', text: 'text-green-700', label: '轨迹' },
  IOU: { bg: 'bg-orange-100', text: 'text-orange-700', label: '欠条' },
  STATEMENT: { bg: 'bg-purple-100', text: 'text-purple-700', label: '对账单' },
  EMAIL: { bg: 'bg-gray-100', text: 'text-gray-700', label: '邮件' },
};

export const MaterialTypeBadge: React.FC<MaterialTypeBadgeProps> = ({ type }) => {
  const config = materialTypeConfig[type];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

interface DirtyDataTypeBadgeProps {
  type: string;
}

const dirtyDataTypeConfig: Record<string, { bg: string; text: string; label: string }> = {
  MISSING_FIELD: { bg: 'bg-red-100', text: 'text-red-700', label: '缺字段' },
  CROSS_DATE: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '跨日' },
  NAME_CHANGE: { bg: 'bg-orange-100', text: 'text-orange-700', label: '改名' },
  AMOUNT_CONFLICT: { bg: 'bg-red-100', text: 'text-red-700', label: '金额冲突' },
  QUANTITY_CONFLICT: { bg: 'bg-red-100', text: 'text-red-700', label: '数量冲突' },
};

export const DirtyDataTypeBadge: React.FC<DirtyDataTypeBadgeProps> = ({ type }) => {
  const config = dirtyDataTypeConfig[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};
