import React from 'react';
import type { TransitionMatrix } from '../../types';
import { formatPercent, formatNumber, cn } from '../../utils/cn';

interface MatrixTableProps {
  matrix: TransitionMatrix;
  highlightCell?: { from: number; to: number };
}

export const MatrixTable: React.FC<MatrixTableProps> = ({ matrix, highlightCell }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-gray-50 p-3 text-left font-semibold text-gray-700 border border-gray-200 min-w-[120px]">
              当前状态 \ 转移至
            </th>
            {matrix.states.map((state, i) => (
              <th
                key={i}
                className="bg-gray-50 p-3 text-center font-semibold border border-gray-200"
                style={{ color: state.color }}
              >
                <div>{state.name}</div>
                <div className="text-xs text-gray-500 font-normal mt-1">
                  n={formatNumber(matrix.sampleSizes[i])}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.states.map((fromState, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td
                className="p-3 font-medium border border-gray-200"
                style={{ color: fromState.color }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: fromState.color }}
                  />
                  {fromState.name}
                  {fromState.isAbsorbing && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      吸收态
                    </span>
                  )}
                </div>
              </td>
              {matrix.states.map((toState, j) => {
                const isHighlighted = highlightCell?.from === i && highlightCell?.to === j;
                const isSelf = i === j;
                const value = matrix.matrix[i][j];
                const count = matrix.counts[i][j];
                
                return (
                  <td
                    key={j}
                    className={cn(
                      'p-3 text-center border border-gray-200 transition-all',
                      isHighlighted && 'bg-blue-50 ring-2 ring-blue-400',
                      isSelf && 'font-semibold'
                    )}
                  >
                    <div
                      className={cn(
                        value > 0.7 && 'text-green-600',
                        value < 0.1 && value > 0 && 'text-red-500',
                        'font-medium'
                      )}
                    >
                      {formatPercent(value)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatNumber(count)}人
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
