import React from 'react';
import { CVExperiment } from '../types';

interface ExperimentTableProps {
  experiments: CVExperiment[];
  title?: string;
}

const typeLabelMap: Record<string, string> = {
  blank: '空白对照',
  standard: '标准品',
  unknown: '未知样',
  qc: '质控样',
};

const statusLabelMap: Record<string, { label: string; bg: string }> = {
  pending: { label: '待测试', bg: 'bg-slate-100 text-slate-600' },
  running: { label: '进行中', bg: 'bg-blue-50 text-blue-700' },
  completed: { label: '已完成', bg: 'bg-emerald-50 text-emerald-700' },
  failed: { label: '失败', bg: 'bg-red-50 text-red-700' },
  blocked: { label: '已拦截', bg: 'bg-red-100 text-red-800' },
};

export const ExperimentTable: React.FC<ExperimentTableProps> = ({ experiments, title = '实验记录明细' }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500">共 {experiments.length} 条记录</span>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-auto scrollbar-thin">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
            <tr>
              <th className="px-4 py-2">实验编号</th>
              <th className="px-4 py-2">批次</th>
              <th className="px-4 py-2">样品</th>
              <th className="px-4 py-2">类型</th>
              <th className="px-4 py-2">操作员</th>
              <th className="px-4 py-2">日期</th>
              <th className="px-4 py-2">电位范围</th>
              <th className="px-4 py-2">扫速</th>
              <th className="px-4 py-2">峰电流</th>
              <th className="px-4 py-2">温度点</th>
              <th className="px-4 py-2">状态</th>
              <th className="px-4 py-2">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {experiments.map(e => {
              const status = statusLabelMap[e.status];
              return (
                <tr key={e.experimentId} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{e.experimentId}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{e.batchId}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{e.sampleName}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {typeLabelMap[e.sampleType] || e.sampleType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{e.operator}</td>
                  <td className="px-4 py-2 text-slate-600">{e.experimentDate}</td>
                  <td className="px-4 py-2 text-slate-600 text-xs">{e.potentialStart}V ~ {e.potentialEnd}V</td>
                  <td className="px-4 py-2 text-slate-600 text-xs">{e.scanRate} mV/s</td>
                  <td className="px-4 py-2 text-slate-700 text-xs font-mono">
                    {e.peakCurrent !== undefined ? `${e.peakCurrent.toExponential(2)}A` : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {e.temperaturePoints && e.temperaturePoints.length > 0 ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        {e.temperaturePoints.length} 个
                      </span>
                    ) : (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">缺失</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.bg}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-600 max-w-xs">
                    {e.manualNote && (
                      <div className="rounded bg-yellow-50 border border-yellow-200 px-2 py-1 text-yellow-800">
                        💬 {e.manualNote}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
