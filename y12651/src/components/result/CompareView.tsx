import { useMemo, useRef, useState, useEffect } from 'react';
import { GitCompare, Move, Layers } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import HudCard from '@/components/ui/HudCard';
import { paramDiff } from '@/utils/sectionMath';
import { getPointsInSection } from '@/utils/sectionMath';
import { cn } from '@/lib/utils';
import type { ParamSnapshot, SectionResult } from '@/types';

function SectionPreview({ snapshot, accent }: { snapshot: ParamSnapshot; accent: 'cyan' | 'warn-yellow' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useGameStore((s) => s.frames);
  const frame = frames[frames.length - 1];
  const points = frame?.points || [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 10) * W, 0);
      ctx.lineTo((i / 10) * W, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i / 10) * H);
      ctx.lineTo(W, (i / 10) * H);
      ctx.stroke();
    }

    const inSection = getPointsInSection(points, snapshot.params);
    const color = accent === 'cyan' ? '0, 229, 255' : '255, 217, 61';

    inSection.forEach((p) => {
      const px = ((p.x + 4) / 8) * W;
      const py = H - ((p.z + 4) / 8) * H;
      const size = p.isOutlier ? 4 : 2;
      ctx.fillStyle = p.isOutlier
        ? `rgba(255, 107, 53, 0.95)`
        : `rgba(${color}, ${0.55 + p.intensity * 0.45})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    });

    const cx = W / 2;
    const cy = H / 2;
    ctx.strokeStyle = `rgba(${color}, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(cx - 40, cy - 40, 80, 80);
    ctx.setLineDash([]);
  }, [snapshot, points, accent]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className="w-full h-auto bg-space-deep/80 rounded border border-cyber-cyan/15"
    />
  );
}

export default function CompareView() {
  const paramHistory = useGameStore((s) => s.paramHistory);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(paramHistory.length - 1);
  const [splitPos, setSplitPos] = useState(50);

  const left = paramHistory[Math.min(leftIdx, paramHistory.length - 1)];
  const right = paramHistory[Math.min(rightIdx, paramHistory.length - 1)];

  const diffs = useMemo(() => {
    if (!left || !right) return {};
    return paramDiff(left.params, right.params);
  }, [left, right]);

  const keys = Object.keys(diffs) as (keyof typeof diffs)[];

  if (!left || !right) {
    return (
      <HudCard title="新旧结论并排对比 · COMPARE" accent="yellow">
        <div className="text-[11px] text-cyan-300/50 text-center py-8">
          参数历史不足，暂无可对比数据
        </div>
      </HudCard>
    );
  }

  const resultCol = (r?: SectionResult) => r ? [
    { label: '截面点数', val: r.pointCount },
    { label: '离群点数', val: r.outlierCount },
    { label: '截面积', val: r.crossSectionArea.toFixed(3) },
  ] : [];

  return (
    <HudCard title="新旧结论并排对比 · COMPARE" accent="yellow" className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <GitCompare className="w-3 h-3 text-warn-yellow" />
          版本
          <select
            value={leftIdx}
            onChange={(e) => setLeftIdx(parseInt(e.target.value))}
            className="bg-space-dark/80 text-cyber-cyan text-[10px] px-1.5 py-0.5 border border-cyber-cyan/20 rounded"
          >
            {paramHistory.map((_, i) => (
              <option key={i} value={i}>V{i + 1}</option>
            ))}
          </select>
          <Move className="w-3 h-3 text-cyan-300/40" />
          <select
            value={rightIdx}
            onChange={(e) => setRightIdx(parseInt(e.target.value))}
            className="bg-space-dark/80 text-warn-yellow text-[10px] px-1.5 py-0.5 border border-warn-yellow/30 rounded"
          >
            {paramHistory.map((_, i) => (
              <option key={i} value={i}>V{i + 1}</option>
            ))}
          </select>
        </div>
        <div className="text-[9px] text-cyan-300/50 font-mono">
          拖动中线调整左右比例
        </div>
      </div>

      <div className="relative grid-bg rounded overflow-hidden border border-cyber-cyan/10" style={{ height: 260 }}>
        <div
          className="absolute top-0 bottom-0 left-0 overflow-hidden border-r border-cyber-cyan/30"
          style={{ width: `${splitPos}%` }}
        >
          <div className="absolute top-2 left-2 hud-text text-[10px] text-cyber-cyan/80 bg-space-deep/70 px-2 py-0.5 rounded z-10">
            旧版本 · V{leftIdx + 1} · {left.operator}
          </div>
          <div className="p-3 pt-8 h-full">
            <SectionPreview snapshot={left} accent="cyan" />
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 right-0 overflow-hidden"
          style={{ width: `${100 - splitPos}%` }}
        >
          <div className="absolute top-2 right-2 hud-text text-[10px] text-warn-yellow/90 bg-space-deep/70 px-2 py-0.5 rounded z-10">
            新版本 · V{rightIdx + 1} · {right.operator}
          </div>
          <div className="p-3 pt-8 h-full flex justify-end">
            <div style={{ width: `${100 * 100 / (100 - splitPos)}%`, marginLeft: `${-splitPos * 100 / (100 - splitPos)}%` }}>
              <SectionPreview snapshot={right} accent="warn-yellow" />
            </div>
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 w-1 bg-warn-yellow/60 cursor-col-resize z-20"
          style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startPos = splitPos;
            const parent = e.currentTarget.parentElement!;
            const rect = parent.getBoundingClientRect();
            const onMove = (ev: MouseEvent) => {
              const delta = ((ev.clientX - startX) / rect.width) * 100;
              setSplitPos(Math.max(10, Math.min(90, startPos + delta)));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-warn-yellow/80 rounded clip-chamfer flex items-center justify-center">
            <Move className="w-3 h-3 text-space-deep" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <div className="hud-text text-[10px] text-cyber-cyan/70 mb-2 flex items-center gap-1.5">
            <Layers className="w-2.5 h-2.5" />
            旧参数 · 结果
          </div>
          <div className="space-y-1 text-[10px] font-mono">
            {resultCol(left.sectionResult).map((r) => (
              <div key={r.label} className="flex justify-between bg-space-dark/50 px-2 py-1 rounded">
                <span className="text-cyan-300/60">{r.label}</span>
                <span className="text-cyber-cyan">{r.val}</span>
              </div>
            ))}
            {left.reason && (
              <div className="text-[9px] text-cyan-300/50 italic pt-1">"原因: {left.reason}"</div>
            )}
          </div>
        </div>
        <div>
          <div className="hud-text text-[10px] text-warn-yellow/80 mb-2 flex items-center gap-1.5">
            <Layers className="w-2.5 h-2.5" />
            新参数 · 结果
          </div>
          <div className="space-y-1 text-[10px] font-mono">
            {resultCol(right.sectionResult).map((r) => (
              <div key={r.label} className="flex justify-between bg-space-dark/50 px-2 py-1 rounded">
                <span className="text-cyan-300/60">{r.label}</span>
                <span className={cn(
                  keys.length > 0 ? 'text-warn-yellow font-semibold' : 'text-cyber-cyan'
                )}>{r.val}</span>
              </div>
            ))}
            {right.reason && (
              <div className="text-[9px] text-warn-yellow/60 italic pt-1">"原因: {right.reason}"</div>
            )}
          </div>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="mt-3 p-2 bg-warn-yellow/5 border border-warn-yellow/20 rounded">
          <div className="text-[10px] text-warn-yellow font-mono mb-1">参数差异 ({keys.length} 项变更)</div>
          <div className="grid grid-cols-2 gap-1">
            {keys.map((k) => (
              <div key={k} className="flex items-center justify-between text-[10px] font-mono bg-space-dark/60 px-1.5 py-0.5 rounded">
                <span className="text-cyan-300/70">{k}</span>
                <span>
                  <span className="text-alert-orange/80 line-through mr-1">{diffs[k]!.before.toFixed(3)}</span>
                  <span className="text-cyan-300/50 mx-0.5">→</span>
                  <span className="text-success-green font-semibold">{diffs[k]!.after.toFixed(3)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </HudCard>
  );
}
