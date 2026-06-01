import React from 'react';
import { Tag } from 'antd';
import type { RiskLevel } from '../types';

interface RiskTagProps {
  level: RiskLevel;
}

const RiskTag: React.FC<RiskTagProps> = ({ level }) => {
  const config = {
    low: { color: 'success', text: '低风险' },
    medium: { color: 'warning', text: '中风险' },
    high: { color: 'orange', text: '高风险' },
    critical: { color: 'error', text: '极高风险' },
  };

  const { color, text } = config[level];

  return (
    <Tag color={color} className={level === 'critical' ? 'animate-pulse-risk' : ''}>
      {text}
    </Tag>
  );
};

export default RiskTag;
