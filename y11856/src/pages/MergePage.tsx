import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, GitMerge, AlertTriangle, FileText, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS, MISJUDGED_COLOR } from '@/types';
import { sourceSamples, targetLabels } from '@/data/sampleData';

export default function MergePage() {
  const mergeDiffs = useStore((s) => s.mergeDiffs);
  const resolveMergeDiff = useStore((s) => s.resolveMergeDiff);

  const stats = useMemo(() => {
    let vectorDiffs = 0;
    let labelDiffs = 0;
    let unresolved = 0;
    for (const d of mergeDiffs) {
      if (d.field === 'vector') vectorDiffs++;
      else labelDiffs++;
      if (d.resolution === 'unresolved') unresolved++;
    }
    return { vectorDiffs, labelDiffs, unresolved, total: mergeDiffs.length };
  }, [mergeDiffs]);

  const sourceMap = useMemo(() => {
    const m = new Map<string, typeof sourceSamples[0]>();
    for (const s of sourceSamples) m.set(s.id, s);
    return m;
  }, []);

  const targetMap = useMemo(() => {
    const m = new Map<string, typeof targetLabels[0]>();
    for (const s of targetLabels) m.set(s.id, s);
    return m;
  }, []);

  const formatVec = (v: number[] | string) => {
    if (typeof v === 'string') return v;
    return `[${v.map((n) => n.toFixed(1)).join(', ')}]`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white/80">
      <div className="border-b border-[#1a2040] px-6 py-4 flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-[#4d9fff] hover:text-[#3d8fee] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <ArrowLeft size={14} />
          返回投影
        </Link>
        <div className="flex items-center gap-2">
          <GitMerge size={18} className="text-[#ff6b35]" />
          <span className="text-sm font-bold text-white/90" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            向量-标签合并差异对比
          </span>
        </div>
      </div>

      <div className="px-6 py-4 flex gap-4">
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#ff6b35]/10 border border-[#ff6b35]/20">
          <AlertTriangle size={16} className="text-[#ff6b35]" />
          <div>
            <div className="text-xs text-white/40">向量差异</div>
            <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.vectorDiffs}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#ff2d78]/10 border border-[#ff2d78]/20">
          <FileText size={16} className="text-[#ff2d78]" />
          <div>
            <div className="text-xs text-white/40">标签冲突</div>
            <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.labelDiffs}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20">
          <AlertTriangle size={16} className="text-[#fbbf24]" />
          <div>
            <div className="text-xs text-white/40">未解决</div>
            <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.unresolved}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#00ffc8]/10 border border-[#00ffc8]/20">
          <Check size={16} className="text-[#00ffc8]" />
          <div>
            <div className="text-xs text-white/40">已解决</div>
            <div className="text-lg font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stats.total - stats.unresolved}</div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="border border-[#1a2040] rounded-lg overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_1fr_120px] bg-[#0f1629] border-b border-[#1a2040]">
            <div className="px-3 py-2 text-xs font-semibold text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>样本ID</div>
            <div className="px-3 py-2 text-xs font-semibold text-white/40 border-l border-[#1a2040]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              样本向量源
            </div>
            <div className="px-3 py-2 text-xs font-semibold text-white/40 border-l border-[#1a2040]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              真实标签源
            </div>
            <div className="px-3 py-2 text-xs font-semibold text-white/40 border-l border-[#1a2040]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              裁决
            </div>
          </div>

          {mergeDiffs.map((diff) => {
            const source = sourceMap.get(diff.sampleId);
            const target = targetMap.get(diff.sampleId);
            const isDiff = diff.resolution === 'unresolved';

            return (
              <div
                key={`${diff.sampleId}-${diff.field}`}
                className={`grid grid-cols-[80px_1fr_1fr_120px] border-b border-[#1a2040] transition-colors ${
                  isDiff ? 'bg-[#fbbf24]/5' : 'bg-transparent'
                }`}
              >
                <div className="px-3 py-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {diff.sampleId}
                  <div className="text-[10px] text-white/30 mt-0.5">{diff.field}</div>
                </div>

                <div className={`px-3 py-3 text-xs border-l ${isDiff && diff.field === 'vector' ? 'border-l-[#ff6b35]/30' : 'border-l-[#1a2040]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {diff.field === 'vector' ? (
                    <span className={isDiff ? 'text-[#ff6b35]' : 'text-white/60'}>
                      {formatVec(diff.sourceValue as number[])}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[diff.sourceValue as string] ?? '#888' }} />
                      <span className={isDiff ? 'text-[#ff6b35]' : 'text-white/60'}>{diff.sourceValue as string}</span>
                    </span>
                  )}
                  {source && diff.field === 'trueLabel' && (
                    <div className="text-[10px] text-white/30 mt-0.5">
                      pred: {source.predictedLabel}
                    </div>
                  )}
                </div>

                <div className={`px-3 py-3 text-xs border-l ${isDiff && diff.field === 'trueLabel' ? 'border-l-[#ff2d78]/30' : 'border-l-[#1a2040]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {diff.field === 'vector' ? (
                    <span className={isDiff ? 'text-[#ff2d78]' : 'text-white/60'}>
                      {formatVec(diff.targetValue as number[])}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[diff.targetValue as string] ?? '#888' }} />
                      <span className={isDiff ? 'text-[#ff2d78]' : 'text-white/60'}>{diff.targetValue as string}</span>
                    </span>
                  )}
                  {target && diff.field === 'trueLabel' && (
                    <div className="text-[10px] text-white/30 mt-0.5">
                      pred: {target.predictedLabel}
                    </div>
                  )}
                </div>

                <div className="px-3 py-3 border-l border-[#1a2040] flex items-center gap-1">
                  {diff.resolution !== 'unresolved' ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded ${diff.resolution === 'source' ? 'bg-[#ff6b35]/15 text-[#ff6b35]' : 'bg-[#ff2d78]/15 text-[#ff2d78]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ← {diff.resolution === 'source' ? '左' : '右'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => resolveMergeDiff(diff.sampleId, diff.field, 'source')}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#ff6b35]/30 text-[#ff6b35] hover:bg-[#ff6b35]/10 transition-colors"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        采用左
                      </button>
                      <button
                        onClick={() => resolveMergeDiff(diff.sampleId, diff.field, 'target')}
                        className="text-[10px] px-2 py-0.5 rounded border border-[#ff2d78]/30 text-[#ff2d78] hover:bg-[#ff2d78]/10 transition-colors"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        采用右
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {mergeDiffs.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            暂无合并差异
          </div>
        )}
      </div>
    </div>
  );
}
