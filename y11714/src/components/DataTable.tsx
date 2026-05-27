import React from 'react';
import { ExperimentResult, GROUND_MATERIALS } from '../types';
import { downloadReport } from '../utils/export';

interface DataTableProps {
  results: ExperimentResult[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExportCSV: () => void;
  onReplay?: (result: ExperimentResult) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  results,
  onDelete,
  onClearAll,
  onExportCSV,
  onReplay,
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMaterialName = (id: string) => {
    return GROUND_MATERIALS.find((m) => m.id === id)?.name || id;
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-cyan-400">📊 实验记录</h3>
        <div className="flex gap-2">
          {results.length > 0 && (
            <>
              <button
                onClick={onExportCSV}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-all"
              >
                导出CSV
              </button>
              <button
                onClick={onClearAll}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-all"
              >
                清空
              </button>
            </>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-2">📝</div>
          <p>暂无实验记录</p>
          <p className="text-sm mt-1">完成实验后点击"保存实验记录"</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-2 text-slate-400 font-medium">时间</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">质量</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">材质</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">下落高度</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">反弹高度</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">恢复系数</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">状态</th>
                <th className="text-left py-2 px-2 text-slate-400 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={result.id}
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    result.isAnomaly ? 'bg-red-900/20' : ''
                  } ${index === 0 ? 'bg-cyan-900/20' : ''}`}
                >
                  <td className="py-2 px-2 text-slate-300">{formatDate(result.timestamp)}</td>
                  <td className="py-2 px-2 text-slate-300">{result.params.ballMass.toFixed(2)}kg</td>
                  <td className="py-2 px-2 text-slate-300">{getMaterialName(result.params.groundMaterial)}</td>
                  <td className="py-2 px-2 text-slate-300">{result.params.dropHeight.toFixed(2)}m</td>
                  <td className="py-2 px-2 text-cyan-400 font-medium">{result.bounceHeight.toFixed(2)}m</td>
                  <td className="py-2 px-2">
                    <span className="px-2 py-0.5 bg-cyan-900/50 text-cyan-400 rounded font-mono">
                      {result.calculatedRestitution.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {result.isAnomaly ? (
                      <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded text-xs">
                        ⚠️ 异常
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                        ✓ 正常
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      {onReplay && (
                        <button
                          onClick={() => onReplay(result)}
                          className="px-2 py-1 bg-blue-600/50 hover:bg-blue-600 text-white text-xs rounded transition-all"
                          title="回放"
                        >
                          ▶
                        </button>
                      )}
                      <button
                        onClick={() => downloadReport(result)}
                        className="px-2 py-1 bg-purple-600/50 hover:bg-purple-600 text-white text-xs rounded transition-all"
                        title="下载报告"
                      >
                        📄
                      </button>
                      <button
                        onClick={() => onDelete(result.id)}
                        className="px-2 py-1 bg-red-600/50 hover:bg-red-600 text-white text-xs rounded transition-all"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">{results.length}</div>
              <div className="text-xs text-slate-500">总实验次数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {results.filter((r) => !r.isAnomaly).length}
              </div>
              <div className="text-xs text-slate-500">正常实验</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {(
                  results.reduce((sum, r) => sum + r.calculatedRestitution, 0) /
                  results.filter((r) => !r.isAnomaly).length
                ).toFixed(3) || '0.000'}
              </div>
              <div className="text-xs text-slate-500">平均恢复系数</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
