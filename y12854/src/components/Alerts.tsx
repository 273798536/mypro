import { Radio } from 'lucide-react';

export function BuoyLateBanner({ affectedConclusions }: { affectedConclusions: string[] | null }) {
  if (!affectedConclusions || !affectedConclusions.length) return null;
  return (
    <div className="bg-warning-amber/10 border border-warning-amber/30 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Radio className="w-4 h-4 text-warning-amber mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-warning-amber">浮标数据晚到</p>
          <p className="text-xs text-slate-300 mt-0.5">
            以下结论受影响：{affectedConclusions.join('、')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TimezoneAlert({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 mb-3">
      <p className="text-xs text-red-400 font-semibold">潮位时区错误拦截</p>
      <p className="text-xs text-slate-300 mt-0.5">{error}</p>
    </div>
  );
}
