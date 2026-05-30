import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, AlertCircle, CheckCircle, Play, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { levels } from '@/data/levels';
import { PARAM_LABELS, PARAM_UNITS, ROW_TYPE_LABELS } from '@/data/levels';
import { renderMriImage } from '@/utils/mriRenderer';
import { twMerge } from 'tailwind-merge';

const rowTypeBgColors: Record<string, string> = {
  empty: 'bg-slate-700/40 text-slate-500',
  comment: 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500',
  missing_column: 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500',
  noise: 'bg-rose-500/10 text-rose-400 border-l-2 border-rose-500',
};

export default function ParamConsole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showRawParams, setShowRawParams] = useState(false);

  const { params, updateParam, conflicts, timeInfo, parseResult, selectLevel, submitSettlement, resetParams } =
    useGameStore();

  const level = levels.find((l) => l.id === id);

  useEffect(() => {
    if (id && (!parseResult || useGameStore.getState().currentLevelId !== id)) {
      selectLevel(id);
    }
  }, [id, selectLevel, parseResult]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !level) return;
    renderMriImage(canvas, params, level, conflicts.length);
  }, [params, level, conflicts]);

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">关卡不存在</p>
      </div>
    );
  }

  const hasFatal = conflicts.some((c) => c.severity === 'fatal');
  const hasError = conflicts.some((c) => c.severity === 'error');
  const hasWarning = conflicts.some((c) => c.severity === 'warning');

  const handleSubmit = () => {
    const result = submitSettlement();
    if (result) {
      navigate(`/result/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,212,170,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,170,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <header className="relative border-b border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-full px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="text-center">
            <h1 className="font-semibold">{level.name}</h1>
            <p className="text-xs text-slate-500">{level.targetPart}</p>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="relative h-[calc(100vh-57px)] grid grid-cols-[320px_1fr_340px] gap-0">
        <aside className="border-r border-slate-800/50 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            扫描参数
          </h2>

          <div className="space-y-5">
            {(Object.keys(level.paramRanges) as (keyof typeof params)[]).map((key) => {
              const range = level.paramRanges[key];
              const hasConflict = conflicts.some((c) => c.params.includes(key));
              const isOptimal = params[key] === level.optimalParams[key];

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      className={twMerge(
                        'text-sm font-medium',
                        hasConflict ? 'text-rose-400' : isOptimal ? 'text-cyan-400' : 'text-slate-300'
                      )}
                    >
                      {PARAM_LABELS[key]}
                    </label>
                    <span className={twMerge('text-sm font-mono tabular-nums', hasConflict ? 'text-rose-400' : 'text-slate-500')}>
                      {params[key]} {PARAM_UNITS[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={params[key]}
                    onChange={(e) => updateParam(key, Number(e.target.value))}
                    className={twMerge(
                      'w-full h-2 rounded-full appearance-none cursor-pointer',
                      hasConflict
                        ? 'bg-rose-500/30 accent-rose-500'
                        : 'bg-slate-700 accent-cyan-500'
                    )}
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{range.min}</span>
                    <span className="text-cyan-500/60">最优 {level.optimalParams[key]}</span>
                    <span>{range.max}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowRawParams(!showRawParams)}
            className="mt-6 w-full text-left text-xs text-slate-400 hover:text-slate-300 transition-colors"
          >
            {showRawParams ? '▼ 隐藏原始参数模板' : '▶ 查看原始参数模板'}
          </button>

          {showRawParams && parseResult && (
            <div className="mt-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500">原始参数模板</span>
                <span className="text-slate-500">
                  有效 {parseResult.validRows}/{parseResult.totalRows} 行
                </span>
              </div>
              <div className="space-y-0.5 font-mono text-[11px] max-h-40 overflow-y-auto">
                {parseResult.badRows.map((row) => (
                  <div
                    key={row.lineNumber}
                    className={twMerge('px-2 py-0.5 rounded truncate', rowTypeBgColors[row.type] || '')}
                    title={row.errorMessage}
                  >
                    <span className="text-slate-600 mr-2">{row.lineNumber}</span>
                    {row.content || '(空行)'}
                    {row.errorMessage && <span className="ml-2 opacity-60">[{ROW_TYPE_LABELS[row.type]}]</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 rounded-3xl blur-xl" />
              <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs text-slate-500 font-mono">MRI_DISPLAY</span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="rounded-lg bg-black"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/50 p-4 flex items-center justify-center gap-4">
            <button
              onClick={resetParams}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重置参数
            </button>
            <button
              onClick={handleSubmit}
              disabled={hasFatal}
              className={twMerge(
                'flex items-center gap-2 px-8 py-2.5 rounded-xl font-medium transition-all',
                hasFatal
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
              )}
            >
              <Play className="w-4 h-4" />
              提交结算
              {hasFatal && <span className="text-xs text-rose-400 ml-1">（有致命冲突）</span>}
            </button>
          </div>
        </section>

        <aside className="border-l border-slate-800/50 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            实时监控
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300">扫描时间</span>
                </div>
                <span
                  className={twMerge(
                    'text-lg font-mono font-bold',
                    timeInfo.exceeded ? 'text-rose-400' : 'text-cyan-400'
                  )}
                >
                  {timeInfo.scanTime.toFixed(0)}s
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={twMerge(
                    'h-full transition-all duration-300',
                    timeInfo.exceeded ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  )}
                  style={{ width: `${Math.min(100, (timeInfo.scanTime / level.timeBudget) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                时间预算: {level.timeBudget}s
                {timeInfo.exceeded && <span className="text-rose-400 ml-2">⚠ 已超限</span>}
              </p>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">参数冲突检测</span>
              </div>
              {conflicts.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  未检测到参数冲突
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div
                      key={i}
                      className={twMerge(
                        'p-2.5 rounded-lg text-xs',
                        c.severity === 'fatal' && 'bg-rose-500/10 border border-rose-500/30 text-rose-400',
                        c.severity === 'error' && 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
                        c.severity === 'warning' && 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-medium mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="uppercase">{c.severity === 'fatal' ? '致命' : c.severity === 'error' ? '错误' : '警告'}</span>
                      </div>
                      <p className="opacity-90">{c.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">坏行统计</span>
              </div>
              {parseResult ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500">空行</p>
                    <p className="font-mono text-lg text-slate-400">
                      {parseResult.badRows.filter((r) => r.type === 'empty').length}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500">备注</p>
                    <p className="font-mono text-lg text-blue-400">
                      {parseResult.badRows.filter((r) => r.type === 'comment').length}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500">缺列</p>
                    <p className="font-mono text-lg text-amber-400">
                      {parseResult.badRows.filter((r) => r.type === 'missing_column').length}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-500">噪声</p>
                    <p className="font-mono text-lg text-rose-400">
                      {parseResult.badRows.filter((r) => r.type === 'noise').length}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">加载中...</p>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
