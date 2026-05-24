import React from 'react';
import { Check, Circle, Clock, AlertTriangle, FileCheck, ArrowRight } from 'lucide-react';
import type { ChainStatus } from '../types';

interface TimelineItem {
  timestamp: string;
  fromStatus?: ChainStatus;
  toStatus: ChainStatus;
  operator: string;
  reason: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4" />,
  PROCESSING: <ArrowRight className="w-4 h-4" />,
  EXCEPTION: <AlertTriangle className="w-4 h-4" />,
  RECONCILING: <Clock className="w-4 h-4" />,
  REVIEW_REQUIRED: <AlertTriangle className="w-4 h-4" />,
  RECONCILED: <Check className="w-4 h-4" />,
  EXPORTED: <FileCheck className="w-4 h-4" />,
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-gray-400',
  PROCESSING: 'bg-blue-500',
  EXCEPTION: 'bg-red-500',
  RECONCILING: 'bg-yellow-500',
  REVIEW_REQUIRED: 'bg-orange-500',
  RECONCILED: 'bg-green-500',
  EXPORTED: 'bg-purple-500',
};

const statusLabel: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  EXCEPTION: '异常',
  RECONCILING: '对账中',
  REVIEW_REQUIRED: '待复核',
  RECONCILED: '已对账',
  EXPORTED: '已导出',
};

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {items.map((item, index) => (
          <li key={index}>
            <div className="relative pb-8">
              {index < items.length - 1 && (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${statusColor[item.toStatus] || 'bg-gray-400'} text-white`}
                  >
                    {statusIcon[item.toStatus] || <Circle className="w-4 h-4" />}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-900 font-medium">
                      {statusLabel[item.toStatus] || item.toStatus}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{item.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">操作者: {item.operator}</p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    {new Date(item.timestamp).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
