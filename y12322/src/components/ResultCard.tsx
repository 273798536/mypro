import { CheckCircle, XCircle } from 'lucide-react';
import { useActiveMaterial, useActiveResult } from '@/store/useStore';

export default function ResultCard() {
  const activeMaterial = useActiveMaterial();
  const activeResult = useActiveResult();

  if (!activeMaterial || !activeResult) return null;

  const hasWarnings = activeResult.warnings.length > 0;
  const hasErrors = activeResult.warnings.some((w) => w.severity === 'error');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">处理结果</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          hasErrors
            ? 'bg-red-500/20 text-red-400'
            : hasWarnings
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {hasErrors ? '含严重警告' : hasWarnings ? '含警告' : '正常'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <XCircle size={12} className="text-red-400 shrink-0" />
            ) : (
              <CheckCircle size={12} className="text-emerald-400 shrink-0" />
            )}
            <span className="text-xs text-slate-400">积分方法</span>
          </div>
          <div className="text-sm text-slate-200 mt-1 font-mono">
            {activeResult.method === 'trapezoidal' ? '梯形法' : '辛普森法'}
          </div>
        </div>

        <div className="px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
          <div className="text-xs text-slate-400">计算时间</div>
          <div className="text-xs text-slate-300 mt-0.5 font-mono">
            {new Date(activeResult.computedAt).toLocaleString('zh-CN')}
          </div>
        </div>

        <div className="px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
          <div className="text-xs text-slate-400">原始材料</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-amber-300 truncate">
              f(x) = {activeMaterial.expression}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
              activeMaterial.source === 'import'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {activeMaterial.source === 'import' ? '导入' : '手动'}
            </span>
          </div>
        </div>

        {activeResult.warnings.length > 0 && (
          <div className="px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
            <div className="text-xs text-slate-400">边界警告数</div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-red-400">
                严重 {activeResult.warnings.filter((w) => w.severity === 'error').length}
              </span>
              <span className="text-xs text-amber-400">
                注意 {activeResult.warnings.filter((w) => w.severity === 'warning').length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
