import { useEffect, useMemo, useState } from 'react';
import TimelineSlider from '@/components/TimelineSlider';
import DetailDrawer from '@/components/DetailDrawer';
import { useProjectionStore } from '@/store/projectionStore';
import {
  ANOMALY_LABELS,
  ANOMALY_COLORS,
  SEVERITY_DOT,
  type ProjectionRecord,
} from '@/types';
import { AlertTriangle, TrendingDown, TrendingUp, Minus, Eye } from 'lucide-react';

interface DiffRecord {
  record: ProjectionRecord;
  change: 'added' | 'removed' | 'changed' | 'unchanged';
  previous?: ProjectionRecord;
}

export default function Timeline() {
  const versions = useProjectionStore((s) => s.versions);
  const records = useProjectionStore((s) => s.records);
  const selectRecord = useProjectionStore((s) => s.selectRecord);
  const selectedId = useProjectionStore((s) => s.selectedRecordId);

  const sorted = useMemo(
    () => [...versions].sort((a, b) => a.importedAt.localeCompare(b.importedAt)),
    [versions],
  );

  const [currentBatchId, setCurrentBatchId] = useState<string | null>(
    sorted[sorted.length - 1]?.batchId ?? null,
  );
  const [compareBatchId, setCompareBatchId] = useState<string | null>(
    sorted.length >= 2 ? sorted[sorted.length - 2].batchId : null,
  );
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!currentBatchId && sorted.length > 0) {
      setCurrentBatchId(sorted[sorted.length - 1].batchId);
    }
  }, [sorted, currentBatchId]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const idx = sorted.findIndex((v) => v.batchId === currentBatchId);
      if (idx < 0) return;
      if (idx >= sorted.length - 1) {
        setPlaying(false);
        return;
      }
      setCurrentBatchId(sorted[idx + 1].batchId);
    }, 2000);
    return () => clearInterval(t);
  }, [playing, currentBatchId, sorted]);

  const currentVersion = sorted.find((v) => v.batchId === currentBatchId);
  const compareVersion = compareBatchId
    ? sorted.find((v) => v.batchId === compareBatchId)
    : undefined;

  const recordsAt = (batchId: string | null | undefined): ProjectionRecord[] => {
    if (!batchId || !currentVersion) return [];
    const cutoff = sorted.find((v) => v.batchId === batchId)?.importedAt;
    if (!cutoff) return [];
    return records.filter((r) => r.importedAt <= cutoff);
  };

  const currentRecords = recordsAt(currentBatchId);
  const prevRecords = recordsAt(compareBatchId);

  const diff = useMemo<DiffRecord[]>(() => {
    const prevMap = new Map(prevRecords.map((r) => [r.id, r]));
    const curMap = new Map(currentRecords.map((r) => [r.id, r]));
    const result: DiffRecord[] = [];
    for (const r of currentRecords) {
      const p = prevMap.get(r.id);
      if (!p) {
        result.push({ record: r, change: 'added' });
      } else if (
        p.anomalyType !== r.anomalyType ||
        p.severity !== r.severity ||
        p.status !== r.status ||
        p.conclusion !== r.conclusion
      ) {
        result.push({ record: r, change: 'changed', previous: p });
      } else {
        result.push({ record: r, change: 'unchanged' });
      }
    }
    for (const p of prevRecords) {
      if (!curMap.has(p.id)) {
        result.push({ record: p, change: 'removed' });
      }
    }
    return result.sort((a, b) => a.record.originalRowNumber - b.record.originalRowNumber);
  }, [currentRecords, prevRecords]);

  const cameraLostNow = currentRecords.filter((r) => r.anomalyType === 'camera_view_lost').length;
  const cameraLostPrev = prevRecords.filter((r) => r.anomalyType === 'camera_view_lost').length;

  const changeCount = (c: DiffRecord['change']) => diff.filter((d) => d.change === c).length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="border-b border-panel-border bg-panel-surface px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-100">时间回放</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              月底复盘 · 课前核对 · 评审展示 · 拖动时间轴查看不同版本的异常变化
            </div>
          </div>
          <div className="flex items-center gap-5">
            <StatTrend label="相机视角丢失" value={cameraLostNow} delta={cameraLostNow - cameraLostPrev} />
            <StatCount label="新增" value={changeCount('added')} tone="lime" />
            <StatCount label="变更" value={changeCount('changed')} tone="amber" />
            <StatCount label="移除" value={changeCount('removed')} tone="rose" />
            <div className="text-[11px] text-zinc-500 font-mono">
              对比版本：
              <select
                value={compareBatchId ?? ''}
                onChange={(e) => setCompareBatchId(e.target.value || null)}
                className="bg-panel-bg border border-panel-border text-zinc-300 px-2 py-1 ml-2 text-[11px] focus:outline-none focus:border-amber-500/60"
              >
                <option value="">不对比</option>
                {sorted.map((v) => (
                  <option key={v.batchId} value={v.batchId} disabled={v.batchId === currentBatchId}>
                    {v.batchId.slice(-4)} · {new Date(v.importedAt).toLocaleDateString('zh-CN')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {diff.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            没有记录。请先在明细联动中导入数据或加载示例数据。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {diff.map((d) => (
              <DiffCard
                key={d.record.id + d.change}
                diff={d}
                onClick={() => selectRecord(d.record.id)}
                active={selectedId === d.record.id}
              />
            ))}
          </div>
        )}
      </div>

      <TimelineSlider
        currentBatchId={currentBatchId}
        onChange={setCurrentBatchId}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
      <DetailDrawer />
    </div>
  );
}

function DiffCard({
  diff,
  onClick,
  active,
}: {
  diff: DiffRecord;
  onClick: () => void;
  active: boolean;
}) {
  const { record, change, previous } = diff;
  const ring =
    change === 'added'
      ? 'border-lime-500/50 hover:border-lime-400'
      : change === 'removed'
        ? 'border-rose-500/50 hover:border-rose-400'
        : change === 'changed'
          ? 'border-amber-500/50 hover:border-amber-400'
          : 'border-panel-border hover:border-zinc-600';
  const badge =
    change === 'added'
      ? { text: '新增', cls: 'bg-lime-500/15 text-lime-400 border-lime-500/30', icon: TrendingUp }
      : change === 'removed'
        ? { text: '移除', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: TrendingDown }
        : change === 'changed'
          ? { text: '变更', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Minus }
          : { text: '未变', cls: 'bg-zinc-700/40 text-zinc-400 border-zinc-600', icon: Minus };
  const BadgeIcon = badge.icon;

  return (
    <button
      onClick={onClick}
      className={`text-left panel p-4 border transition-all ${ring} ${
        active ? 'bg-amber-500/5 ring-2 ring-amber-500/60' : 'bg-panel-surface hover:bg-panel-hover'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 ${SEVERITY_DOT[record.severity]}`} />
          <span className={`chip ${ANOMALY_COLORS[record.anomalyType]}`}>
            {record.anomalyType === 'camera_view_lost' && <AlertTriangle className="w-3 h-3" />}
            {ANOMALY_LABELS[record.anomalyType]}
          </span>
        </div>
        <span className={`chip ${badge.cls} flex items-center gap-1`}>
          <BadgeIcon className="w-3 h-3" />
          {badge.text}
        </span>
      </div>
      <div className="data-mono text-sm text-zinc-100 mb-1">{record.imageName}</div>
      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
        <span>Row {record.originalRowNumber}</span>
        <span className="font-mono truncate max-w-[120px]">{record.sourceNote}</span>
      </div>
      <div className="text-xs text-zinc-400 line-clamp-2 min-h-[2em]">
        {change === 'changed' && previous ? (
          <>
            <span className="line-through text-zinc-600 mr-2">{short(previous.conclusion)}</span>
            <span className="text-amber-300">→ {short(record.conclusion)}</span>
          </>
        ) : (
          short(record.conclusion)
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-panel-border/60">
        <span className="text-[10px] font-mono text-zinc-600">{record.importBatchId.slice(-4)}</span>
        <span className="text-[10px] text-cyan-400 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          查看详情
        </span>
      </div>
    </button>
  );
}

function short(s: string, n = 60) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function StatTrend({ label, value, delta }: { label: string; value: number; delta: number }) {
  const up = delta > 0;
  const down = delta < 0;
  return (
    <div className="leading-tight">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-lg font-semibold ${value > 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
          {value}
        </span>
        {delta !== 0 && (
          <span className={`text-[11px] font-mono ${up ? 'text-rose-400' : 'text-lime-400'}`}>
            {up ? '▲' : '▼'}
            {Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function StatCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'lime' | 'amber' | 'rose';
}) {
  const color = tone === 'lime' ? 'text-lime-400' : tone === 'amber' ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="leading-tight">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`font-mono text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
