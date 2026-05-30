import { Grid3X3, Info } from 'lucide-react';
import type { Transition } from '../types';
import { MEMBER_STATE_LABELS, MEMBER_STATE_COLORS } from '../types';

interface TransitionMatrixProps {
  matrix: Transition[][];
}

export function TransitionMatrix({ matrix }: TransitionMatrixProps) {
  const states = matrix.map(row => row[0]?.from).filter(Boolean);

  const getHeatColor = (probability: number) => {
    const intensity = Math.min(probability, 1);
    const r = Math.round(239 - intensity * 150);
    const g = Math.round(68 + intensity * 100);
    const b = Math.round(68 + intensity * 50);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getTextColor = (probability: number) => {
    return probability > 0.5 ? 'white' : 'text-gray-800';
  };

  if (matrix.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="w-5 h-5 text-slate-700" />
          <h3 className="font-semibold text-slate-800">状态转移矩阵</h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          暂无数据，请先上传数据并运行计算
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Grid3X3 className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">状态转移矩阵</h3>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5" />
          行→列：从状态A转移到状态B的概率
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-tl-lg">
                从 \ 到
              </th>
              {states.map(state => (
                <th
                  key={state}
                  className="p-2 text-center text-xs font-medium border border-gray-200"
                  style={{ color: MEMBER_STATE_COLORS[state], backgroundColor: `${MEMBER_STATE_COLORS[state]}10` }}
                >
                  {MEMBER_STATE_LABELS[state]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td
                  className="p-2 text-xs font-medium border border-gray-200 bg-gray-50"
                  style={{ color: MEMBER_STATE_COLORS[row[0]?.from || 'active'] }}
                >
                  {MEMBER_STATE_LABELS[row[0]?.from || 'active']}
                </td>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`p-2 text-center text-xs font-mono border border-gray-200 transition-all duration-200 hover:scale-105 cursor-default relative group ${getTextColor(cell.probability)}`}
                    style={{ backgroundColor: getHeatColor(cell.probability) }}
                    title={`${MEMBER_STATE_LABELS[cell.from]} → ${MEMBER_STATE_LABELS[cell.to]}\n次数: ${cell.count}\n概率: ${(cell.probability * 100).toFixed(2)}%`}
                  >
                    <span className="font-medium">
                      {(cell.probability * 100).toFixed(1)}%
                    </span>
                    <div className="absolute -top-1 -right-1 text-[10px] opacity-60">
                      n={cell.count}
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      转移次数: {cell.count}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(0) }}></div>
          <span className="text-xs text-gray-500">低概率</span>
        </div>
        <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-rose-200 via-rose-400 to-rose-600"></div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">高概率</span>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: getHeatColor(1) }}></div>
        </div>
      </div>
    </div>
  );
}
