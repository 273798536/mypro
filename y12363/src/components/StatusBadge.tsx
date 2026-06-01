import React from 'react';
import { Tag } from 'antd';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { AnomalyType, AnomalyLevel } from '../types';
import { ANOMALY_TYPE_LABELS, ANOMALY_LEVEL_COLORS, ANOMALY_TYPE_TO_LEVEL } from '../constants';

interface StatusBadgeProps {
  type?: AnomalyType | null;
  level?: AnomalyLevel;
  showIcon?: boolean;
  showText?: boolean;
}

const iconMap: Record<AnomalyLevel, React.ReactNode> = {
  [AnomalyLevel.CRITICAL]: <ShieldAlert size={14} />,
  [AnomalyLevel.WARNING]: <AlertTriangle size={14} />,
  [AnomalyLevel.INFO]: <Info size={14} />,
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  level,
  showIcon = true,
  showText = true,
}) => {
  if (!type) {
    return (
      <Tag icon={showIcon ? <AlertCircle size={14} /> : undefined} color="success">
        {showText ? '正常' : null}
      </Tag>
    );
  }

  const displayLevel = level || ANOMALY_TYPE_TO_LEVEL[type];
  const color = ANOMALY_LEVEL_COLORS[displayLevel];
  const label = ANOMALY_TYPE_LABELS[type];
  const icon = iconMap[displayLevel];

  return (
    <Tag
      icon={showIcon ? icon : undefined}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color,
        fontWeight: 500,
      }}
    >
      {showText ? label : null}
    </Tag>
  );
};

export default StatusBadge;
