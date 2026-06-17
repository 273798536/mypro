import React, { useState } from 'react';
import { RiskMatrixCell } from '../types/risk';
import { getRiskGradientColor } from '../utils/color';
import { formatNumber } from '../utils/format';

interface RiskMatrixProps {
  matrix: RiskMatrixCell[][];
  title?: string;
  explanation?: string;
}

const likelihoodLabels = ['极低', '低', '中等', '高', '极高'];
const severityLabels = ['可忽略', '轻微', '中等', '严重', '灾难性'];

export const RiskMatrix: React.FC<RiskMatrixProps> = ({ matrix, title, explanation }) => {
  const [hoveredCell, setHoveredCell] = useState<RiskMatrixCell | null>(null);

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-display text-slate-900 mb-1">{title}</h3>
          {explanation && (
            <p className="text-sm text-slate-500">{explanation}</p>
          )}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-1 text-xs">
            <div></div>
            {severityLabels.map((label, i) => (
              <div key={i} className="text-center text-slate-500 font-medium py-2 px-1">
                {label}
              </div>
            ))}

            {matrix.map((row, rowIndex) => (
              <React.Fragment key={rowIndex}>
                <div className="flex items-center justify-end pr-2 text-slate-500 font-medium py-4">
                  {likelihoodLabels[rowIndex]}
                </div>
                {row.map((cell, colIndex) => {
                  const isHovered = hoveredCell && hoveredCell.likelihood === cell.likelihood && hoveredCell.severity === cell.severity;
                  const bgColor = getRiskGradientColor(cell.riskLevel);

                  return (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`aspect-square rounded flex items-center justify-center font-bold text-white text-sm transition-all duration-200 ${
                        isHovered ? 'scale-110 shadow-lg ring-2 ring-ocean-400 ring-offset-2' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: bgColor }}
                    >
                      {cell.count || '—'}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span>发生可能性 →</span>
            </div>
            <div className="flex items-center gap-4">
              {['低', '中', '高'].map((level, i) => (
                <div key={level} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: getRiskGradientColor(i + 1) }}
                  />
                  <span>{level}风险</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {hoveredCell && (
          <div className="w-72 bg-slate-50 rounded-lg p-4 border border-slate-200 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: getRiskGradientColor(hoveredCell.riskLevel) }}
              >
                {hoveredCell.riskLevel >= 4 ? '高风险' :
                 hoveredCell.riskLevel >= 2 ? '中风险' : '低风险'}
              </span>
              <span className="text-sm font-mono text-slate-600">
                {hoveredCell.count} 条记录
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">发生可能性</span>
                <span className="text-slate-700 font-medium">{likelihoodLabels[hoveredCell.likelihood]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">影响程度</span>
                <span className="text-slate-700 font-medium">{severityLabels[hoveredCell.severity]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">风险评分</span>
                <span className="text-slate-700 font-mono font-medium">
                  {formatNumber(hoveredCell.riskScore, 1)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-ocean-700">说明：</span>
                {hoveredCell.explanation}
              </p>
            </div>

            {hoveredCell.affectedPoints && hoveredCell.affectedPoints.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-600 mb-1">影响点位：</p>
                <div className="flex flex-wrap gap-1">
                  {hoveredCell.affectedPoints.map((point) => (
                    <span key={point} className="px-1.5 py-0.5 bg-ocean-100 text-ocean-700 rounded text-xs font-mono">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
