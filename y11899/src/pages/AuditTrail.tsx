import { useStore } from '@/store/useStore';
import { DIMENSION_LABELS } from '@/types';
import type { WeightConfig } from '@/types';
import { ShieldCheck, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS) as (keyof WeightConfig)[];

function weightSum(w: WeightConfig) {
  return DIMENSION_KEYS.reduce((s, k) => s + w[k], 0);
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function WeightChangeCard({ record }: { record: typeof useStore extends { getState: () => { weightHistory: (infer T)[] } } ? T : never }) {
  const prevTotal = weightSum(record.previous);
  const currTotal = weightSum(record.current);
  let dotColor: string | null = null;
  if (prevTotal === 100 && currTotal !== 100) dotColor = 'bg-amber-400';
  else if (prevTotal !== 100 && currTotal === 100) dotColor = 'bg-emerald-500';

  return (
    <div className="relative border-l-2 border-slate-200 pl-4 pb-4">
      <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-400" />
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{formatTime(record.timestamp)}</span>
          <div className="flex items-center gap-2">
            {dotColor && (
              <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
            )}
            <span className="font-medium text-slate-700">{record.operator}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {DIMENSION_KEYS.map(key => {
            const prev = record.previous[key];
            const curr = record.current[key];
            const diff = curr - prev;
            const color = diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-500' : 'text-slate-500';
            return (
              <div key={key} className="col-span-2 grid grid-cols-2 items-center">
                <span className="text-slate-600">{DIMENSION_LABELS[key]}</span>
                <span className={`font-mono ${color}`}>
                  {prev} <ArrowRight size={12} className="inline mx-1" /> {curr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AuditTrail() {
  const weightHistory = useStore(s => s.weightHistory);
  const consistencyReport = useStore(s => s.consistencyReport);
  const runConsistency = useStore(s => s.runConsistency);

  const sortedHistory = [...weightHistory].reverse();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">权重变更历史</h2>
          </div>
          {sortedHistory.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-sm text-slate-400">
              暂无权重变更记录
            </div>
          ) : (
            <div className="space-y-0">
              {sortedHistory.map(record => (
                <WeightChangeCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={20} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">一致性校验</h2>
          </div>
          <button
            onClick={runConsistency}
            className="bg-slate-800 text-white font-medium px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors mb-4"
          >
            执行校验
          </button>
          {consistencyReport ? (
            <div className="space-y-3">
              <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-3 ${
                consistencyReport.passed ? 'border-emerald-300' : 'border-red-300'
              }`}>
                {consistencyReport.passed ? (
                  <CheckCircle2 size={32} className="text-emerald-500 shrink-0" />
                ) : (
                  <XCircle size={32} className="text-red-500 shrink-0" />
                )}
                <span className={`text-2xl font-bold ${
                  consistencyReport.passed ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {consistencyReport.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
              <div className="space-y-2">
                {consistencyReport.checks.map((check, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border-l-4 text-sm ${
                      check.passed
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-red-50 border-red-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      {check.passed ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      {check.name}
                    </div>
                    <p className="mt-1 text-slate-600 pl-6">{check.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                校验时间：{formatTime(consistencyReport.timestamp)}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-sm text-slate-400">
              尚未执行一致性校验，请点击上方按钮
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
