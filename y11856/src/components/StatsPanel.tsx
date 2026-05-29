import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS, MISJUDGED_COLOR, OUTLIER_COLOR } from '@/types';
import { BarChart3, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const CATEGORIES = ['A', 'B', 'C'];

export default function StatsPanel() {
  const samples = useStore((s) => s.samples);
  const outliers = useStore((s) => s.outliers);
  const config = useStore((s) => s.config);
  const selectedSampleId = useStore((s) => s.selectedSampleId);

  const totalCount = samples.length;

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CATEGORIES) {
      map[c] = samples.filter((s) => s.trueLabel === c).length;
    }
    return map;
  }, [samples]);

  const misjudged = useMemo(() => samples.filter((s) => s.isMisjudged), [samples]);
  const misjudgedPct = totalCount > 0 ? ((misjudged.length / totalCount) * 100).toFixed(1) : '0.0';

  const outlierCount = outliers.length;

  const selectedSample = useMemo(() => {
    if (!selectedSampleId) return null;
    return samples.find((s) => s.id === selectedSampleId) ?? null;
  }, [selectedSampleId, samples]);

  const isSelectedOutlier = useMemo(() => {
    if (!selectedSampleId) return false;
    return outliers.some((o) => o.sampleId === selectedSampleId);
  }, [selectedSampleId, outliers]);

  const methodLabel = config.method === 'pca' ? 'PCA' : config.method === 'tsne' ? 't-SNE' : 'UMAP';

  const paramDisplay = useMemo(() => {
    const entries = Object.entries(config.params);
    if (entries.length === 0) return '—';
    return entries.map(([k, v]) => `${k}=${v}`).join(', ');
  }, [config.params]);

  const truncVector = (vec: number[], maxLen = 4) => {
    if (vec.length <= maxLen) return `[${vec.map((v) => v.toFixed(2)).join(', ')}]`;
    return `[${vec.slice(0, maxLen).map((v) => v.toFixed(2)).join(', ')}, …]`;
  };

  return (
    <div className="flex flex-col gap-5 bg-[#0f1629] border-l border-[#1a2040] p-4 min-w-[260px] text-white/80">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <BarChart3 size={16} />
        <span>统计信息</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">总样本数</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalCount}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              <span className="text-white/50 flex-1">类别 {cat}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{categoryCounts[cat] ?? 0}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a2040] pt-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle size={12} style={{ color: MISJUDGED_COLOR }} />
            <span className="text-white/50 flex-1">误判</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {misjudged.length} <span className="text-white/30">({misjudgedPct}%)</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle size={12} style={{ color: OUTLIER_COLOR }} />
            <span className="text-white/50 flex-1">异常点</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{outlierCount}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#1a2040] pt-4 flex flex-col gap-2">
        <div className="text-xs text-white/50">当前方法</div>
        <div className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {methodLabel}
        </div>
        <div className="text-xs text-white/40" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {paramDisplay}
        </div>
      </div>

      {selectedSample && (
        <div className="border-t border-[#1a2040] pt-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/50">
            <Info size={12} />
            <span>选中样本</span>
          </div>

          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">ID</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedSample.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">真实标签</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[selectedSample.trueLabel] ?? '#888' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedSample.trueLabel}</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">预测标签</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[selectedSample.predictedLabel] ?? '#888' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedSample.predictedLabel}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">置信度</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(selectedSample.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-white/40">向量</span>
              <span className="text-[10px] text-white/60 break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {truncVector(selectedSample.vector)}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              {selectedSample.isMisjudged && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ backgroundColor: `${MISJUDGED_COLOR}20`, color: MISJUDGED_COLOR, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <AlertTriangle size={10} />
                  误判
                </span>
              )}
              {isSelectedOutlier && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ backgroundColor: `${OUTLIER_COLOR}20`, color: OUTLIER_COLOR, fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <AlertCircle size={10} />
                  异常点
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
