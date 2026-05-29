import React from 'react';
import { cn } from '@/lib/utils';

interface StatusTagProps {
  status: string;
  type?: 'review' | 'business' | 'error' | 'order' | 'process' | 'transaction';
  className?: string;
}

const statusConfig: Record<string, Record<string, { bg: string; text: string; label: string }>> = {
  review: {
    '未复核': { bg: 'bg-gray-100', text: 'text-gray-600', label: '未复核' },
    '复核中': { bg: 'bg-blue-100', text: 'text-blue-700', label: '复核中' },
    '已复核': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已复核' },
    '已冲回': { bg: 'bg-amber-100', text: 'text-amber-700', label: '已冲回' },
  },
  business: {
    '正常': { bg: 'bg-blue-100', text: 'text-blue-700', label: '正常' },
    '升舱退回': { bg: 'bg-purple-100', text: 'text-purple-700', label: '升舱退回' },
    '活动双倍': { bg: 'bg-pink-100', text: 'text-pink-700', label: '活动双倍' },
    '里程过期': { bg: 'bg-red-100', text: 'text-red-700', label: '里程过期' },
  },
  error: {
    '空行': { bg: 'bg-gray-100', text: 'text-gray-600', label: '空行' },
    '缺列': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '缺列' },
    '格式错误': { bg: 'bg-orange-100', text: 'text-orange-700', label: '格式错误' },
    '数据异常': { bg: 'bg-red-100', text: 'text-red-700', label: '数据异常' },
  },
  order: {
    '待审核': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待审核' },
    '已审核': { bg: 'bg-blue-100', text: 'text-blue-700', label: '已审核' },
    '已兑付': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已兑付' },
    '已退回': { bg: 'bg-red-100', text: 'text-red-700', label: '已退回' },
  },
  process: {
    '未处理': { bg: 'bg-red-100', text: 'text-red-700', label: '未处理' },
    '已冲回': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已冲回' },
    '已豁免': { bg: 'bg-amber-100', text: 'text-amber-700', label: '已豁免' },
  },
  transaction: {
    '待处理': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待处理' },
    '已完成': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '已完成' },
    '已取消': { bg: 'bg-gray-100', text: 'text-gray-600', label: '已取消' },
  },
};

export const StatusTag: React.FC<StatusTagProps> = ({ status, type = 'review', className }) => {
  const config = statusConfig[type]?.[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  
  return (
    <span className={cn('status-tag', config.bg, config.text, className)}>
      {config.label}
    </span>
  );
};
