import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';

const QualityGauge: React.FC = () => {
  const getQualityMetrics = useAppStore(state => state.getQualityMetrics);
  const dataVersion = useAppStore(state => state.dataVersion);

  const metrics = useMemo(() => getQualityMetrics(), [getQualityMetrics, dataVersion]);

  const getColor = (value: number) => {
    if (value >= 90) return '#4682b4';
    if (value >= 70) return '#D4A84B';
    return '#C41E3A';
  };

  const renderGauge = (label: string, value: number, color: string) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.75;
    const offset = arcLength * (1 - value / 100);
    const dashArray = `${arcLength * (value / 100)} ${arcLength}`;
    
    return (
      <div className="flex flex-col items-center">
        <svg width="130" height="100" viewBox="0 0 130 100">
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke="#D4A84B"
            strokeWidth="10"
            strokeLinecap="round"
            transform="rotate(225 65 65)"
            strokeDasharray={arcLength}
            opacity="0.2"
          />
          <circle
            cx="65"
            cy="65"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            transform="rotate(225 65 65)"
            strokeDasharray={dashArray}
            strokeDashoffset={0}
            className="transition-all duration-700"
          />
          <text
            x="65"
            y="70"
            textAnchor="middle"
            fontSize="24"
            fill={color}
            fontFamily="Noto Serif SC, serif"
            fontWeight="bold"
          >
            {value}%
          </text>
        </svg>
        <p
          className="text-center text-sm mt-1"
          style={{
            color: '#8B4513',
            fontFamily: 'Noto Serif SC, serif'
          }}
        >
          {label}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
      <h3 className="font-serif text-ink-600 mb-3">数据质量概览</h3>
      <div className="grid grid-cols-3 gap-4">
        {renderGauge('完整率', metrics.completeness, getColor(metrics.completeness))}
        {renderGauge('准确率', metrics.accuracy, getColor(metrics.accuracy))}
        {renderGauge('异常率', metrics.anomalyRate, getColor(100 - metrics.anomalyRate))}
      </div>
      <div className="mt-3 pt-3 border-t border-ochre-200 grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-2xl font-serif text-ink-600">{metrics.totalPoints}</div>
          <div className="text-xs text-ochre-600">总点数</div>
        </div>
        <div>
          <div className="text-2xl font-serif text-azure-600">{metrics.normalCount}</div>
          <div className="text-xs text-ochre-600">正常</div>
        </div>
        <div>
          <div className="text-2xl font-serif text-cinnabar-600">{metrics.byStatus['out-of-bounds'] || 0}</div>
          <div className="text-xs text-ochre-600">边界越界</div>
        </div>
        <div>
          <div className="text-2xl font-serif text-rattan-600">
            {(metrics.byStatus['color-invalid'] || 0) + (metrics.byStatus['missing-unit'] || 0) + (metrics.byStatus['supplementary'] || 0)}
          </div>
          <div className="text-xs text-ochre-600">其他异常</div>
        </div>
      </div>
    </div>
  );
};

export default QualityGauge;
