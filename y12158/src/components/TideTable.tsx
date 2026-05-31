import { AlertTriangle, Check, X } from 'lucide-react';
import type { TideData } from '../types';
import { GENERATION_THRESHOLD_VALUE } from '../data/mockData';

interface TideTableProps {
  data: TideData[];
}

export function TideTable({ data }: TideTableProps) {
  const missingCount = data.filter(d => d.isMissing).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">潮位记录表</h3>
        {missingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">
              {missingCount} 条数据缺测
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b">时间</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b">潮位 (m)</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b">状态</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 border-b">发电可用</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={`border-b border-gray-100 transition-colors ${
                  row.isMissing
                    ? 'bg-red-50 hover:bg-red-100'
                    : row.level >= GENERATION_THRESHOLD_VALUE
                    ? 'bg-emerald-50/50 hover:bg-emerald-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-3 py-2 font-medium text-gray-800">
                  {row.time}
                </td>
                <td className="px-3 py-2">
                  {row.isMissing ? (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <X className="w-4 h-4" />
                      缺测
                      {row.predicted && (
                        <span className="text-gray-400 font-normal text-xs ml-1">
                          (预测: {row.predicted}m)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className={`font-semibold ${
                      row.level >= GENERATION_THRESHOLD_VALUE
                        ? 'text-emerald-600'
                        : 'text-gray-700'
                    }`}>
                      {row.level}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.isMissing ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      数据缺失
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                      <Check className="w-3 h-3" />
                      正常
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.isMissing ? (
                    <span className="text-gray-400 text-xs">无法判断</span>
                  ) : row.level >= GENERATION_THRESHOLD_VALUE ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-white rounded text-xs font-medium">
                      是
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">否</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-100 rounded"></div>
          <span>潮位达标</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span>数据缺测</span>
        </div>
      </div>
    </div>
  );
}
