import React, { useState } from 'react';
import { BatchSummary, CVExperiment, TemperaturePoint } from '../types';

interface BatchTrackerProps {
  batches: BatchSummary[];
  experiments: CVExperiment[];
  onAppendTemperature?: (experimentId: string, point: TemperaturePoint) => void;
}

const statusConfig: Record<string, { label: string; bg: string; ring: string; icon: string }> = {
  ok: { label: '正常', bg: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', icon: '✓' },
  warning: { label: '有警告', bg: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', icon: '⚠' },
  blocked: { label: '已拦截', bg: 'bg-red-50 text-red-700', ring: 'ring-red-200', icon: '✗' },
};

export const BatchTracker: React.FC<BatchTrackerProps> = ({ batches, experiments, onAppendTemperature }) => {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(batches[0]?.batchId || null);
  const [tempForm, setTempForm] = useState<{ expId: string; time: string; temp: string }>({ expId: '', time: '', temp: '' });

  const batch = batches.find(b => b.batchId === selectedBatch);
  const batchExps = experiments.filter(e => e.batchId === selectedBatch);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <h3 className="text-base font-semibold text-slate-800">批次追踪（温度补录后自动更新复测建议）</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        <div className="border-b md:border-b-0 md:border-r border-slate-200 max-h-[560px] overflow-auto scrollbar-thin">
          {batches.map(b => {
            const cfg = statusConfig[b.status];
            const active = b.batchId === selectedBatch;
            return (
              <button
                key={b.batchId}
                onClick={() => setSelectedBatch(b.batchId)}
                className={`w-full text-left p-3 border-b border-slate-100 transition ${
                  active ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">{b.batchId}</span>
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.ring}`}>
                    <span>{cfg.icon}</span> {cfg.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>{b.totalExperiments} 条实验</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${b.hasBlankControl ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span>空白{b.hasBlankControl ? '已做' : '缺失'}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${b.hasTemperatureCurve ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>温度{b.hasTemperatureCurve ? '完整' : '待补'}</span>
                </div>
                {b.issues.filter(i => !i.resolved).length > 0 && (
                  <div className="mt-1 text-xs text-red-600">
                    {b.issues.filter(i => !i.resolved).length} 条待处理问题
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="md:col-span-2 p-4 space-y-4 max-h-[560px] overflow-auto scrollbar-thin">
          {batch ? (
            <>
              <div className={`rounded-lg p-4 ${statusConfig[batch.status].bg}`}>
                <div className="text-xs font-semibold opacity-70">批次状态</div>
                <div className="text-lg font-bold mt-1">{statusConfig[batch.status].label}</div>
                {batch.retestSuggestion && (
                  <div className="mt-2 text-sm leading-relaxed">
                    <span className="font-semibold">复测建议：</span>{batch.retestSuggestion}
                  </div>
                )}
                <div className="mt-2 text-xs opacity-70">最后更新：{new Date(batch.lastUpdated).toLocaleString('zh-CN')}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">实验明细（可补录温度）</h4>
                <div className="space-y-2">
                  {batchExps.map(exp => {
                    const tempPoints = exp.temperaturePoints || [];
                    return (
                      <div key={exp.experimentId} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="font-mono text-sm font-medium text-slate-800">{exp.experimentId}</span>
                            <span className="ml-2 text-xs text-slate-500">{exp.sampleName}（{exp.operator}）</span>
                          </div>
                          <span className="text-xs text-slate-500">{tempPoints.length} 个温度点</span>
                        </div>
                        {tempPoints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tempPoints.map((p, idx) => (
                              <span key={idx} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {p.time}: {p.temperature}℃
                              </span>
                            ))}
                          </div>
                        )}
                        {onAppendTemperature && exp.status !== 'pending' && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <input
                              type="text"
                              placeholder="时间 HH:mm"
                              value={tempForm.expId === exp.experimentId ? tempForm.time : ''}
                              onChange={e => setTempForm({ ...tempForm, expId: exp.experimentId, time: e.target.value })}
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="number"
                              step="0.1"
                              placeholder="温度 ℃"
                              value={tempForm.expId === exp.experimentId ? tempForm.temp : ''}
                              onChange={e => setTempForm({ ...tempForm, expId: exp.experimentId, temp: e.target.value })}
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => {
                                if (tempForm.expId === exp.experimentId && tempForm.time && tempForm.temp) {
                                  onAppendTemperature(exp.experimentId, { time: tempForm.time, temperature: parseFloat(tempForm.temp) });
                                  setTempForm({ expId: '', time: '', temp: '' });
                                }
                              }}
                              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition"
                            >
                              补录温度
                            </button>
                          </div>
                        )}
                        {exp.manualNote && (
                          <div className="mt-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-1.5">
                            <span className="text-xs font-semibold text-yellow-700">人工备注：</span>
                            <span className="text-xs text-yellow-800">{exp.manualNote}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">请选择一个批次</div>
          )}
        </div>
      </div>
    </div>
  );
};
