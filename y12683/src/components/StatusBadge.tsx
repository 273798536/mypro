import { CheckCircle2, AlertTriangle, XCircle, CircleDot } from 'lucide-react';
import type { CollisionRisk, ConclusionResult, ImportRecordStatus } from '@/types';

interface RiskBadgeProps {
  risk: CollisionRisk;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const config = {
    low: {
      color: 'bg-success-green-500/15 text-success-green-500 border-success-green-500/30',
      label: '低风险',
      icon: CheckCircle2,
    },
    medium: {
      color: 'bg-warning-orange-500/15 text-warning-orange-500 border-warning-orange-500/30',
      label: '中风险',
      icon: AlertTriangle,
    },
    high: {
      color: 'bg-red-500/15 text-red-500 border-red-500/30',
      label: '高风险',
      icon: XCircle,
    },
  };

  const cfg = config[risk];
  return (
    <span className={`status-badge border ${cfg.color}`}>
      <cfg.icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

interface ResultBadgeProps {
  result: ConclusionResult;
}

export function ResultBadge({ result }: ResultBadgeProps) {
  const config = {
    pass: {
      color: 'bg-success-green-500/15 text-success-green-500 border-success-green-500/30',
      label: '通过',
      icon: CheckCircle2,
    },
    warning: {
      color: 'bg-warning-orange-500/15 text-warning-orange-500 border-warning-orange-500/30',
      label: '警告',
      icon: AlertTriangle,
    },
    fail: {
      color: 'bg-red-500/15 text-red-500 border-red-500/30',
      label: '未通过',
      icon: XCircle,
    },
  };

  const cfg = config[result];
  return (
    <span className={`status-badge border ${cfg.color}`}>
      <cfg.icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

interface ImportStatusBadgeProps {
  status: ImportRecordStatus;
}

export function ImportStatusBadge({ status }: ImportStatusBadgeProps) {
  const config = {
    success: {
      color: 'bg-success-green-500/15 text-success-green-500 border-success-green-500/30',
      label: '成功',
      icon: CheckCircle2,
    },
    duplicate_detected: {
      color: 'bg-warning-orange-500/15 text-warning-orange-500 border-warning-orange-500/30',
      label: '检测到重复',
      icon: AlertTriangle,
    },
    failed: {
      color: 'bg-red-500/15 text-red-500 border-red-500/30',
      label: '失败',
      icon: XCircle,
    },
  };

  const cfg = config[status];
  return (
    <span className={`status-badge border ${cfg.color}`}>
      <cfg.icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

interface ImportSliceStatusBadgeProps {
  status: 'new' | 'duplicate' | 'merged';
}

export function ImportSliceStatusBadge({ status }: ImportSliceStatusBadgeProps) {
  const config = {
    new: {
      color: 'bg-deep-sea-500/15 text-deep-sea-400 border-deep-sea-500/30',
      label: '新数据',
      icon: CircleDot,
    },
    duplicate: {
      color: 'bg-warning-orange-500/15 text-warning-orange-500 border-warning-orange-500/30',
      label: '重复',
      icon: AlertTriangle,
    },
    merged: {
      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      label: '已合并',
      icon: CheckCircle2,
    },
  };

  const cfg = config[status];
  return (
    <span className={`status-badge border ${cfg.color}`}>
      <cfg.icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}
