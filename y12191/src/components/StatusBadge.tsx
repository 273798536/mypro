import type { SampleType, AssignmentStatus, IssueSeverity } from '../types';

interface SampleTypeBadgeProps {
  type: SampleType;
}

export function SampleTypeBadge({ type }: SampleTypeBadgeProps) {
  const config = {
    normal: { label: '正常', className: 'badge-normal' },
    boundary: { label: '边界', className: 'badge-boundary' },
    bad: { label: '异常', className: 'badge-bad' },
  };
  
  const { label, className } = config[type];
  
  return (
    <span className={`badge ${className}`}>
      {label}
    </span>
  );
}

interface AssignmentStatusBadgeProps {
  status: AssignmentStatus;
}

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const config = {
    assigned: { label: '已分配', className: 'badge-assigned' },
    backup: { label: '候补', className: 'badge-backup' },
    rejected: { label: '已拒绝', className: 'badge-rejected' },
    pending: { label: '待审核', className: 'bg-navy-100 text-navy-800' },
  };
  
  const { label, className } = config[status];
  
  return (
    <span className={`badge ${className}`}>
      {label}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: IssueSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = {
    error: { label: '错误', className: 'bg-wine-100 text-wine-800' },
    warning: { label: '警告', className: 'bg-amber-100 text-amber-800' },
    info: { label: '提示', className: 'bg-navy-100 text-navy-800' },
  };
  
  const { label, className } = config[severity];
  
  return (
    <span className={`badge ${className}`}>
      {label}
    </span>
  );
}

interface PhaseBadgeProps {
  phase: 'phase1' | 'phase2' | 'corrected';
}

export function PhaseBadge({ phase }: PhaseBadgeProps) {
  const config = {
    phase1: { label: '第一阶段', className: 'bg-navy-100 text-navy-800' },
    phase2: { label: '第二阶段', className: 'bg-forest-100 text-forest-800' },
    corrected: { label: '已修正', className: 'bg-amber-100 text-amber-800' },
  };
  
  const { label, className } = config[phase];
  
  return (
    <span className={`badge ${className}`}>
      {label}
    </span>
  );
}
