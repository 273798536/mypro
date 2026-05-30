import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useGameStore } from '@/store/useGameStore';
import { levels } from '@/data/levels';
import { ROW_TYPE_LABELS } from '@/data/levels';
import { exportSettlementCSV } from '@/utils/export';
import { renderMriImage } from '@/utils/mriRenderer';
import { twMerge } from 'tailwind-merge';

const rowTypeColors: Record<string, string> = {
  empty: 'bg-slate-700/50',
  comment: 'bg-blue-500/10 border-l-2 border-blue-500',
  missing_column: 'bg-amber-500/10 border-l-2 border-amber-500',
  noise: 'bg-rose-500/10 border-l-2 border-rose-500',
};

export default function ResultReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optimalCanvasRef = useRef<HTMLCanvasElement>(null);

  const { lastSettlement, submitSettlement } = useGameStore();
  const level = levels.find((l) => l.id === id);

  useEffect(() => {
    if (!lastSettlement) {
      submitSettlement();
    }
  }, [lastSettlement, submitSettlement]);

  useEffect(() => {
    if (canvasRef.current && level && lastSettlement) {
      renderMriImage(canvasRef.current, lastSettlement.params, level, lastSettlement.conflicts.length);
    }
    if (optimalCanvasRef.current && level) {
      renderMriImage(optimalCanvasRef.current, level.optimalParams, level, 0);
    }
  }, [level, lastSettlement]);

  if (!level || !lastSettlement) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

  const radarData = lastSettlement.scoreItems.map((item) => ({
    subject: item.name,
    score: (item.score / item.maxScore) * 100,
    fullMark: 100,
  }));

  const scoreGrade =
    lastSettlement.totalScore >= 80
      ? { text: '优秀', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
      : lastSettlement.totalScore >= 60
      ? { text: '良好', color: 'text-cyan-400', bg: 'bg-cyan-500/20' }
      : lastSettlement.totalScore >= 40
      ? { text: '及格', color: 'text-amber-400', bg: 'bg-amber-500/20' }
      : { text: '待提高', color: 'text-rose-400', bg: 'bg-rose-500/20' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="relative border-b border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(`/level/${id}`)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回调参
          </button>
          <div className="text-center">
            <h1 className="font-semibold">结算复盘</h1>
            <p className="text-xs text-slate-500">{level.name}</p>
          </div>
          <button
            onClick={() => exportSettlementCSV(lastSettlement, level.name)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出成绩
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-[1fr_300px] gap-8">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">最终得分</h2>
                  <span className={twMerge('px-3 py-1 rounded-full text-sm font-medium', scoreGrade.bg, scoreGrade.color)}>
                    {scoreGrade.text}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{level.name} · {new Date(lastSettlement.timestamp).toLocaleString('zh-CN')}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold tabular-nums bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {lastSettlement.totalScore}
                </div>
                <div className="text-slate-500 text-sm">/ {lastSettlement.maxScore} 分</div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {lastSettlement.scoreItems.map((item) => {
                const pct = item.score / item.maxScore;
                return (
                  <div key={item.name} className="text-center">
                    <div className="h-24 relative">
                      <div className="absolute inset-x-0 bottom-0 bg-slate-800 rounded-t-lg overflow-hidden">
                        <div
                          className={twMerge(
                            'absolute inset-x-0 bottom-0 transition-all duration-700',
                            pct >= 0.8
                              ? 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                              : pct >= 0.6
                              ? 'bg-gradient-to-t from-cyan-500 to-cyan-400'
                              : pct >= 0.4
                              ? 'bg-gradient-to-t from-amber-500 to-amber-400'
                              : 'bg-gradient-to-t from-rose-500 to-rose-400'
                          )}
                          style={{ height: `${pct * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-lg font-bold tabular-nums">{item.score}</div>
                      <div className="text-xs text-slate-500">{item.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">能力雷达图</h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="得分" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">扫描时间</span>
                <span className={twMerge('font-mono', lastSettlement.isTimeExceeded ? 'text-rose-400' : 'text-cyan-400')}>
                  {lastSettlement.scanTime.toFixed(0)}s / {lastSettlement.timeBudget}s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">参数冲突</span>
                <span className={twMerge('font-mono', lastSettlement.conflicts.length > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                  {lastSettlement.conflicts.length} 项
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">坏行数量</span>
                <span className="font-mono text-amber-400">{lastSettlement.badRows.length} 行</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">伪影类型</span>
                <span className="font-mono text-blue-400">{lastSettlement.artifactTypes.length} 种</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            图像对比
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-slate-500 mb-3 text-center">最优参数图像</p>
              <div className="flex justify-center">
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-2">
                  <canvas ref={optimalCanvasRef} width={280} height={280} className="rounded-lg bg-black" style={{ imageRendering: 'pixelated' }} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center font-mono">
                TR={level.optimalParams.TR} TE={level.optimalParams.TE} NEX={level.optimalParams.NEX}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-3 text-center">当前参数图像</p>
              <div className="flex justify-center">
                <div
                  className={twMerge(
                    'bg-slate-900 border rounded-xl p-2',
                    lastSettlement.totalScore >= 60 ? 'border-cyan-500/30' : 'border-rose-500/30'
                  )}
                >
                  <canvas ref={canvasRef} width={280} height={280} className="rounded-lg bg-black" style={{ imageRendering: 'pixelated' }} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center font-mono">
                TR={lastSettlement.params.TR} TE={lastSettlement.params.TE} NEX={lastSettlement.params.NEX}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            分数解释
          </h3>
          <div className="space-y-3">
            {lastSettlement.scoreItems.map((item) => {
              const pct = item.score / item.maxScore;
              return (
                <div key={item.name} className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {pct >= 0.8 ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : pct >= 0.6 ? (
                        <CheckCircle className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono text-lg tabular-nums">
                      {item.score} <span className="text-slate-500 text-sm">/ {item.maxScore}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={twMerge(
                        'h-full transition-all duration-500',
                        pct >= 0.8
                          ? 'bg-emerald-500'
                          : pct >= 0.6
                          ? 'bg-cyan-500'
                          : 'bg-rose-500'
                      )}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400">{item.explanation}</p>
                  <div className="mt-2 flex gap-2">
                    {item.relatedParams.map((p) => (
                      <span key={p} className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400 font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {lastSettlement.conflicts.length > 0 && (
          <section className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-rose-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              参数冲突（未混入正常结果，已标记待讲师复核）
            </h3>
            <div className="space-y-2">
              {lastSettlement.conflicts.map((c, i) => (
                <div key={i} className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={twMerge(
                        'px-2 py-0.5 rounded text-xs font-medium uppercase',
                        c.severity === 'fatal' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      )}
                    >
                      {c.severity}
                    </span>
                    <span className="text-sm font-mono text-rose-300">{c.params.join(' + ')}</span>
                  </div>
                  <p className="text-sm text-rose-200/80">{c.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            坏行列表（已单独隔离）
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500">
                  <th className="text-left py-2 px-3 font-medium">行号</th>
                  <th className="text-left py-2 px-3 font-medium">类型</th>
                  <th className="text-left py-2 px-3 font-medium">内容</th>
                  <th className="text-left py-2 px-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {lastSettlement.badRows.map((row, i) => (
                  <tr key={i} className={twMerge('border-b border-slate-800/50', rowTypeColors[row.type])}>
                    <td className="py-2 px-3 font-mono text-slate-500">{row.lineNumber}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50">{ROW_TYPE_LABELS[row.type]}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs truncate max-w-xs" title={row.content}>
                      {row.content || '(空行)'}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{row.errorMessage || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {lastSettlement.artifactTypes.length > 0 && (
          <section className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">检测到的伪影类型</h3>
            <div className="flex flex-wrap gap-2">
              {lastSettlement.artifactTypes.map((a, i) => (
                <span key={i} className="px-3 py-1.5 bg-blue-500/10 rounded-lg text-sm text-blue-300">
                  {a}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
