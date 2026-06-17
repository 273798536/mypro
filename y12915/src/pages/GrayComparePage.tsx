import { useState, useMemo } from 'react';
import useAppStore from '@/store/useAppStore';
import { calculateConfidenceInterval, checkSignificantDifference } from '@/utils/confidence';
import { cn } from '@/lib/utils';
import { GitCompare, ChevronRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export default function GrayComparePage() {
  const { versions, samples } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<string[]>(versions.map((v) => v.id));

  function toggleVersion(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  const versionStats = useMemo(() => {
    return versions
      .filter((v) => selectedIds.includes(v.id))
      .map((v, idx) => {
        const vSamples = samples.filter((s) => s.modelVersionId === v.id);
        const scores = vSamples.map((s) => s.humanCorrectedScore ?? s.modelScore);
        const ci = calculateConfidenceInterval(scores);
        const histogramBins = Array(10).fill(0);
        for (const s of scores) {
          const binIdx = Math.min(9, Math.max(0, Math.floor(s / 10)));
          histogramBins[binIdx]++;
        }
        const maxBin = Math.max(...histogramBins, 1);
        return {
          version: v,
          ci,
          idx,
          histogramBins: histogramBins.map((c) => (c / maxBin) * 100),
          histogramRaw: histogramBins,
        };
      });
  }, [versions, samples, selectedIds]);

  const latestId = versionStats[0]?.version.id;
  const latestCI = versionStats[0]?.ci;

  const heatmapData = useMemo(() => {
    const rows: Array<{
      rowVersion: typeof versions[0];
      cells: Array<{
        colVersion: typeof versions[0];
        diffMean: number;
        significant: boolean;
        diffStr: string;
      }>;
    }> = [];

    const activeStats = versionStats;

    for (let i = 0; i < activeStats.length; i++) {
      const rowV = activeStats[i].version;
      const rowCI = activeStats[i].ci;
      const cells: typeof rows[0]['cells'] = [];
      for (let j = 0; j < activeStats.length; j++) {
        const colV = activeStats[j].version;
        const colCI = activeStats[j].ci;
        const diff = colCI.mean - rowCI.mean;
        const sig = checkSignificantDifference(rowCI, colCI) === 'significant';
        cells.push({
          colVersion: colV,
          diffMean: diff,
          significant: sig && i !== j,
          diffStr: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`,
        });
      }
      rows.push({ rowVersion: rowV, cells });
    }

    return rows;
  }, [versionStats]);

  function cellBg(diff: number, isDiagonal: boolean, significant: boolean) {
    if (isDiagonal) return 'bg-slate-700/60';
    const abs = Math.abs(diff);
    if (abs < 2) return 'bg-slate-700/40';
    const intensity = Math.min(1, abs / 10);
    if (diff > 0) {
      return significant
        ? `bg-emerald-500/${Math.round(0.2 + intensity * 0.5)} border-emerald-400/50`
        : `bg-emerald-500/${Math.round(0.1 + intensity * 0.2)}`;
    }
    return significant
      ? `bg-rose-500/${Math.round(0.2 + intensity * 0.5)} border-rose-400/50`
      : `bg-rose-500/${Math.round(0.1 + intensity * 0.2)}`;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <GitCompare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                灰度版本对比
              </h1>
              <p className="text-lg text-slate-400 mt-0.5">
                并排比较多个版本的评测指标与置信区间差异
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-violet-500" />
              <h2 className="text-lg font-semibold text-slate-100">选择对比版本</h2>
              <span className="text-xs text-slate-500">（至少选择 1 个）</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(versions.map((v) => v.id))}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedIds(versions.slice(0, 1).map((v) => v.id))}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-700/60 text-slate-300 hover:bg-slate-700 border border-slate-600 transition-colors"
              >
                只看最新
              </button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {versions.map((v, i) => {
              const selected = selectedIds.includes(v.id);
              return (
                <label
                  key={v.id}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all',
                    selected
                      ? 'bg-sky-600/20 text-sky-200 border-sky-500/50 shadow-sm shadow-sky-500/10'
                      : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleVersion(v.id)}
                    className="w-4 h-4 rounded accent-sky-500"
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{v.version}</span>
                    {i === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        LATEST
                      </span>
                    )}
                  </div>
                  <ChevronRight size={14} className={cn(
                    'transition-colors',
                    selected ? 'text-sky-400' : 'text-slate-600'
                  )} />
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-sky-500" />
            <h2 className="text-lg font-semibold text-slate-100">版本并排对比表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-900/60">
                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">版本号</th>
                  <th className="px-4 py-3.5 text-left">训练日期</th>
                  <th className="px-4 py-3.5 text-right">样本数</th>
                  <th className="px-4 py-3.5 text-right">均值</th>
                  <th className="px-4 py-3.5 text-right">95% CI</th>
                  <th className="px-4 py-3.5 text-right">标准差</th>
                  <th className="px-4 py-3.5 text-right">与最新版差异</th>
                  <th className="px-4 py-3.5 text-center">显著性</th>
                  <th className="px-5 py-3.5 text-left w-48">Mini 分布</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {versionStats.map(({ version, ci, idx, histogramBins }) => {
                  const diffMean = latestCI ? ci.mean - latestCI.mean : 0;
                  const sig = latestId && version.id !== latestId
                    ? checkSignificantDifference(ci, latestCI!)
                    : null;
                  const isLatest = version.id === latestId;

                  return (
                    <tr
                      key={version.id}
                      className={cn(
                        'hover:bg-slate-700/30 transition-colors',
                        isLatest && 'bg-sky-500/5'
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{version.version}</span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                              最新
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                          {version.description}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-400">{version.trainDate}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-200">{ci.n}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={cn(
                          'font-mono font-bold',
                          isLatest ? 'text-sky-300' : 'text-slate-200'
                        )}>
                          {ci.mean.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-400">
                        [{ci.lower.toFixed(1)}, {ci.upper.toFixed(1)}]
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-300">
                        {ci.std.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isLatest ? (
                          <span className="text-slate-600 text-xs">-</span>
                        ) : (
                          <span className={cn(
                            'font-mono font-bold inline-flex items-center gap-1',
                            diffMean > 0 ? 'text-emerald-400' : diffMean < 0 ? 'text-rose-400' : 'text-slate-400'
                          )}>
                            {diffMean > 0 ? <TrendingUp size={12} /> : diffMean < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {diffMean >= 0 ? '+' : ''}{diffMean.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isLatest ? (
                          <span className="text-slate-600 text-xs">-</span>
                        ) : sig === 'significant' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            ★★ 显著
                          </span>
                        ) : sig === 'not_significant' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-700/40 border border-slate-600/50">
                            不显著
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-amber-400 bg-amber-500/15 border border-amber-500/30">
                            数据不足
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-end gap-0.5 h-8 w-full">
                          {histogramBins.map((h, bi) => (
                            <div
                              key={bi}
                              className={cn(
                                'flex-1 rounded-t transition-all',
                                isLatest ? 'bg-sky-400/70' : 'bg-slate-500/50'
                              )}
                              style={{ height: `${Math.max(4, h)}%` }}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/80 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-semibold text-slate-100">均值差异热力图</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-emerald-500/60" />
                <span>提升</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-600/60" />
                <span>无差异</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-rose-500/60" />
                <span>下降</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">★</span>
                <span>显著差异</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div
              className="grid gap-1 min-w-fit"
              style={{
                gridTemplateColumns: `120px repeat(${versionStats.length}, 110px)`,
              }}
            >
              <div className="p-2" />
              {versionStats.map(({ version }) => (
                <div
                  key={`col-${version.id}`}
                  className="p-2 text-center text-xs font-semibold text-slate-300 bg-slate-700/40 rounded-lg border border-slate-700"
                >
                  {version.version}
                </div>
              ))}

              {heatmapData.map((row, ri) => (
                <>
                  <div
                    key={`row-${row.rowVersion.id}`}
                    className="p-2 text-sm font-semibold text-slate-300 flex items-center justify-end pr-3 bg-slate-700/40 rounded-lg border border-slate-700"
                  >
                    {row.rowVersion.version}
                    {ri === 0 && (
                      <span className="ml-1.5 text-[9px] bg-sky-500/30 text-sky-300 px-1 rounded">LATEST</span>
                    )}
                  </div>
                  {row.cells.map((cell, ci) => {
                    const isDiag = ri === ci;
                    return (
                      <div
                        key={`cell-${ri}-${ci}`}
                        className={cn(
                          'p-3 rounded-lg border flex flex-col items-center justify-center min-h-[72px] transition-all hover:scale-[1.03]',
                          cellBg(cell.diffMean, isDiag, cell.significant),
                          cell.significant && 'border-2 shadow-sm',
                          isDiag && 'border-dashed'
                        )}
                      >
                        <div className={cn(
                          'text-lg font-bold font-mono',
                          isDiag
                            ? 'text-slate-400'
                            : cell.diffMean > 0
                            ? 'text-emerald-300'
                            : cell.diffMean < 0
                            ? 'text-rose-300'
                            : 'text-slate-300'
                        )}>
                          {isDiag ? '—' : cell.diffStr}
                        </div>
                        <div className="text-[10px] mt-1">
                          {isDiag ? (
                            <span className="text-slate-500">基准</span>
                          ) : cell.significant ? (
                            <span className={cell.diffMean > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              ★★ p&lt;0.05
                            </span>
                          ) : (
                            <span className="text-slate-500">n.s.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {versionStats.some((_, i) =>
            versionStats.some(
              (_, j) => i !== j && heatmapData[i]?.cells[j]?.significant
            )
          ) && (
            <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-amber-300">注意：</span>
                检测到版本间存在统计学显著差异（★★ p&lt;0.05），建议结合业务场景评估差异是否具有实际意义，避免过分解读统计显著性。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
