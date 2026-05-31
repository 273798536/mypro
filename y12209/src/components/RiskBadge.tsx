import React from 'react';
import { RiskType } from '../types';
import { riskTypeLabels } from '../data/mockData';
import { AlertTriangle, FileX, Merge } from 'lucide-react';

interface RiskBadgeProps {
  riskType: RiskType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const riskConfig: Record<RiskType, {
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  delay: {
    bgColor: 'bg-amber-900/40',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-700',
    icon: <AlertTriangle className="w-3 h-3" />
  },
  invoice_reverse: {
    bgColor: 'bg-rose-900/40',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-700',
    icon: <FileX className="w-3 h-3" />
  },
  project_merge: {
    bgColor: 'bg-violet-900/40',
    textColor: 'text-violet-300',
    borderColor: 'border-violet-700',
    icon: <Merge className="w-3 h-3" />
  }
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ riskType, showIcon = true, size = 'sm' }) => {
  const config = riskConfig[riskType];
  const label = riskTypeLabels[riskType];
  
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  return (
    <span 
      className={`inline-flex items-center gap-1 ${sizeClasses} ${config.bgColor} ${config.textColor} border ${config.borderColor} rounded font-medium`}
    >
      {showIcon && config.icon}
      {label}
    </span>
  );
};

export default RiskBadge;
