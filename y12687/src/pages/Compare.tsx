import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { useNavigate } from 'react-router-dom';
import ProfileCanvas from '../components/ProfileCanvas';
import { ArrowLeft, GitCompare, ChevronDown } from 'lucide-react';
import { formatDateTime, anomalyTypeLabel } from '../utils/data';
import type { ProfileSnapshot, DataRecord } from '../types';

export default function Compare() {
  const navigate = useNavigate();
  const snapshots = useAppStore((s) => s.snapshots);
  const records = useAppStore((s) => s.records);

  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(0, snapshots.length - 1));
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const derivedSnapshots = useMemo<ProfileSnapshot[]>(() => {
    const current: ProfileSnapshot = {
      id: 'current',
      timestamp: Date.now(),
      data: records,
      version: snapshots.length + 1,
      label: '当前实时剖面',
    };
    return snapshots.length > 0 ? [...snapshots, current] : [current];
  }, [snapshots, records]);

  const leftData = derivedSnapshots[leftIdx]?.data || [];
  const rightData = derivedSnapshots[rightIdx]?.data || [];

  const diff = useMemo(() => {
    const leftAnomalies = leftData.filter((r) => r.isAnomaly);
    const rightAnomalies = rightData.filter((r) => r.isAnomaly);
    const leftIds = new Set(leftAnomalies.map((r) => r.id));
    const rightIds = new Set(rightAnomalies.map((r) => r.id));

    const removed: DataRecord[] = leftAnomalies.filter((r) => !rightIds.has(r.id));
    const added: DataRecord[] = rightAnomalies.filter((r) => !leftIds.has(r.id));
    const unchanged: DataRecord[] = leftAnomalies.filter((r) => rightIds.has(r.id));

    return { removed, added, unchanged, leftCount: leftAnomalies.length, rightCount: rightAnomalies.length };
  }, [leftData, rightData]);

  const SnapshotSelect = ({
    value,
    onChange,
    open,
    setOpen,
    side,
  }: {
    value: number;
    onChange: (n: number) => void;
    open: boolean;
    setOpen: (b: boolean) => void;
    side: 'left' | 'right';
  }) => (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-metro-bg border border-metro-border rounded-lg text-sm text-metro-text hover:border-metro-primary transition-colors"
      >
        <span className="font-mono">
          v{derivedSnapshots[value]?.version} · {derivedSnapshots[value]?.label}
        </span>
        <ChevronDown size={14} className={`text-metro-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${side === 'left' ? 'left-0' : 'right-0'} top-full mt-1 w-full min-w-[260px] bg-metro-panel border border-metro-border rounded-lg shadow-xl z-10 max-h-72 overflow-y-auto`}>
          {derivedSnapshots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { onChange(i); setOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-metro-primary/10 transition-colors border-b border-metro-border/50 last:border-b-0 ${
                i === value ? 'bg-metro-primary/20 text-metro-primary' : 'text-metro-text'
              }`}
            >
              <div className="font-mono text-sm">v{s.version} · {s.label}</div>
              <div className="font-mono text-xs text-metro-muted mt-0.5">
                {formatDateTime(s.timestamp)} · {s.data.length} 条记录 · {s.data.filter(r => r.isAnomaly).length} 个异常
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (derivedSnapshots.length < 1) {
    return (
      <div className="min-h-screen p-6">
        <button onClick={() => navigate('/')} className="btn-control mb-4 flex items-center gap-1.5 w-fit">
          <ArrowLeft size={14} /> 返回主界面
        </button>
        <div className="panel p-12 text-center">
          <GitCompare size={40} className="mx-auto mb-3 text-metro-muted" />
          <p className="text-metro-muted">暂无剖面图快照，请先在主界面保存剖面图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="btn-control flex items-center gap-1.5">
              <ArrowLeft size={14} /> 返回
            </button>
            <div>
              <h1 className="text-xl font-semibold text-metro-text flex items-center gap-2">
                <GitCompare size={20} className="text-metro-primary" />
                剖面图对比
              </h1>
              <p className="text-sm text-metro-muted">并排查看新旧剖面图，直观评估修改影响范围</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title text-metro-primary">旧剖面 / Left</h3>
              <div className="w-56">
                <SnapshotSelect value={leftIdx} onChange={setLeftIdx} open={leftOpen} setOpen={setLeftOpen} side="left" />
              </div>
            </div>
            <div className="p-3 h-[520px]">
              <ProfileCanvas
                customRecords={leftData}
                interactive={false}
                label={`v${derivedSnapshots[leftIdx]?.version} · ${derivedSnapshots[leftIdx]?.label}`}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title text-metro-accent">新剖面 / Right</h3>
              <div className="w-56">
                <SnapshotSelect value={rightIdx} onChange={setRightIdx} open={rightOpen} setOpen={setRightOpen} side="right" />
              </div>
            </div>
            <div className="p-3 h-[520px]">
              <ProfileCanvas
                customRecords={rightData}
                interactive={false}
                label={`v${derivedSnapshots[rightIdx]?.version} · ${derivedSnapshots[rightIdx]?.label}`}
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">变更差异分析</h3>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-metro-muted">
                旧: <span className="text-metro-text">{diff.leftCount}</span> 异常
              </span>
              <span className="text-metro-muted">→</span>
              <span className="text-metro-muted">
                新: <span className="text-metro-text">{diff.rightCount}</span> 异常
              </span>
              <span className="text-metro-primary font-semibold">
                净变化: {diff.rightCount - diff.leftCount >= 0 ? '+' : ''}{diff.rightCount - diff.leftCount}
              </span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="data-label mb-2 flex items-center gap-1">
                <span className="status-dot bg-metro-muted" /> 未变更 ({diff.unchanged.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {diff.unchanged.slice(0, 10).map((r) => (
                  <div key={r.id} className="text-xs font-mono text-metro-muted px-2 py-1 bg-metro-bg rounded border border-metro-border">
                    #{r.id.slice(0, 6)} · {anomalyTypeLabel(r.anomalyType)}
                  </div>
                ))}
                {diff.unchanged.length === 0 && <div className="text-xs text-metro-muted">无</div>}
              </div>
            </div>
            <div>
              <div className="data-label mb-2 flex items-center gap-1">
                <span className="status-dot bg-metro-success" /> 已排除 ({diff.removed.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {diff.removed.slice(0, 10).map((r) => (
                  <div key={r.id} className="text-xs font-mono text-metro-success px-2 py-1 bg-metro-success/10 rounded border border-metro-success/30">
                    #{r.id.slice(0, 6)} · {anomalyTypeLabel(r.anomalyType)}
                  </div>
                ))}
                {diff.removed.length === 0 && <div className="text-xs text-metro-muted">无</div>}
              </div>
            </div>
            <div>
              <div className="data-label mb-2 flex items-center gap-1">
                <span className="status-dot bg-metro-danger" /> 新增异常 ({diff.added.length})
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {diff.added.slice(0, 10).map((r) => (
                  <div key={r.id} className="text-xs font-mono text-metro-danger px-2 py-1 bg-metro-danger/10 rounded border border-metro-danger/30">
                    #{r.id.slice(0, 6)} · {anomalyTypeLabel(r.anomalyType)}
                  </div>
                ))}
                {diff.added.length === 0 && <div className="text-xs text-metro-muted">无</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
