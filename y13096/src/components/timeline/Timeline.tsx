import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { useReplayStore } from '../../store/replayStore';
import type { MaterialItem } from '../../../shared/types';

const W = 1200, H = 180, M = { top: 22, right: 50, bottom: 40, left: 50 };
const INNER_W = W - M.left - M.right;
const INNER_H = H - M.top - M.bottom;

function materialY(m: MaterialItem): number {
  if (m.type === 'point') return 0.75;
  if (m.type === 'attachment') return 0.45;
  return 0.18;
}
function materialColor(m: MaterialItem, selected: boolean, isCurrent: boolean): string {
  if (selected) return '#FFD93D';
  if (isCurrent) return '#FFD93D';
  if (m.attachmentMeta?.isLate) return '#FF7A45';
  if (m.fillsGapId) return '#FF4D4F';
  if (m.hasModifiedCaliber) return '#60A5FA';
  if (m.processStatus === 'need_evidence') return '#FF7A45';
  if (m.processStatus === 'rejected') return '#FB7185';
  if (m.type === 'point') return '#00D4AA';
  if (m.type === 'attachment') return '#38BDF8';
  return '#A78BFA';
}
function materialRadius(m: MaterialItem, selected: boolean, isCurrent: boolean): number {
  if (selected || isCurrent) return 6;
  if (m.attachmentMeta?.isLate || m.fillsGapId) return 5;
  return 3.5;
}

export const Timeline: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef({ dragging: false });

  const all = useReplayStore(s => s.allMaterials);
  const gaps = useReplayStore(s => s.timelineGaps);
  const filter = useReplayStore(s => s.filter);
  const currentTime = useReplayStore(s => s.currentTime);
  const isPlaying = useReplayStore(s => s.isPlaying);
  const speed = useReplayStore(s => s.speed);
  const selectedId = useReplayStore(s => s.selectedMaterialId);
  const togglePlay = useReplayStore(s => s.togglePlay);
  const setCurrentTime = useReplayStore(s => s.setCurrentTime);
  const setSpeed = useReplayStore(s => s.setSpeed);
  const selectMaterial = useReplayStore(s => s.selectMaterial);
  const tickTime = useReplayStore(s => s.tickTime);
  const setSidebarTab = useReplayStore(s => s.setSidebarTab);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => tickTime(), 250);
    return () => window.clearInterval(id);
  }, [isPlaying, tickTime]);

  const domain = useMemo<[Date, Date]>(() => ([
    new Date(filter.dateRange.start),
    new Date(filter.dateRange.end)
  ]), [filter.dateRange]);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
    const xScale = d3.scaleTime().domain(domain).range([0, INNER_W]);

    const grid = g.append('g').attr('class', 'timeline-grid');
    const ticks = xScale.ticks(d3.timeMinute.every(15) as any);
    ticks.forEach(t => {
      grid.append('line')
        .attr('x1', xScale(t)).attr('x2', xScale(t))
        .attr('y1', 0).attr('y2', INNER_H);
    });

    const axisG = g.append('g').attr('class', 'timeline-axis')
      .attr('transform', `translate(0,${INNER_H})`)
      .call(d3.axisBottom(xScale)
        .ticks(d3.timeMinute.every(15) as any)
        .tickFormat((d: any) => d3.timeFormat('%H:%M')(d)));
    axisG.select('.domain').attr('stroke-width', 1.5);
    axisG.selectAll('line').attr('y1', -INNER_H).attr('y2', 0).attr('stroke', 'rgba(0,212,170,0.07)');

    // defs: 缺段pattern
    const defs = svg.append('defs');
    const p1 = defs.append('pattern')
      .attr('id', 'gapCriticalPattern').attr('width', 8).attr('height', 8)
      .attr('patternUnits', 'userSpaceOnUse');
    p1.append('rect').attr('width', 8).attr('height', 8).attr('fill', 'rgba(255,77,79,0.05)');
    p1.append('line').attr('x1', 0).attr('y1', 8).attr('x2', 8).attr('y2', 0)
      .attr('stroke', 'rgba(255,77,79,0.65)').attr('stroke-width', 1);
    const p2 = defs.append('pattern')
      .attr('id', 'gapWarningPattern').attr('width', 8).attr('height', 8)
      .attr('patternUnits', 'userSpaceOnUse');
    p2.append('rect').attr('width', 8).attr('height', 8).attr('fill', 'rgba(255,122,69,0.04)');
    p2.append('line').attr('x1', 0).attr('y1', 8).attr('x2', 8).attr('y2', 0)
      .attr('stroke', 'rgba(255,122,69,0.55)').attr('stroke-width', 1);

    // 缺段 band
    gaps.forEach(gap => {
      const sx = xScale(new Date(gap.start));
      const ex = xScale(new Date(gap.end));
      const band = g.append('g');
      band.append('rect')
        .attr('x', sx).attr('y', -2)
        .attr('width', Math.max(4, ex - sx)).attr('height', INNER_H + 4)
        .attr('rx', 2)
        .attr('class', gap.severity === 'critical' ? 'timeline-gap-critical' : 'timeline-gap-warning');
      band.append('text')
        .attr('x', (sx + ex) / 2).attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', gap.severity === 'critical' ? '#FF4D4F' : '#FF7A45')
        .text(`⚠ ${gap.id.toUpperCase()} · ${gap.durationMinutes}min · ${gap.severity.toUpperCase()}`);
    });

    // 类型分隔线 + label
    const labels = [
      { y: 0.18, label: '口头说明 · ORAL', color: '#A78BFA' },
      { y: 0.45, label: '附件材料 · ATTACHMENT', color: '#38BDF8' },
      { y: 0.75, label: '航路点位 · POINT', color: '#00D4AA' }
    ];
    labels.forEach(l => {
      g.append('line')
        .attr('x1', 0).attr('x2', INNER_W)
        .attr('y1', l.y * INNER_H).attr('y2', l.y * INNER_H)
        .attr('stroke', 'rgba(30,58,95,0.5)').attr('stroke-dasharray', '3 5');
      g.append('text')
        .attr('x', -8).attr('y', l.y * INNER_H - 5)
        .attr('font-size', 9).attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', l.color).attr('opacity', 0.75).attr('text-anchor', 'end')
        .text(l.label);
    });

    // 材料点
    const curT = new Date(currentTime).getTime();
    let currentFrame: MaterialItem | null = null;
    for (const m of all) { if (new Date(m.timestamp).getTime() <= curT) currentFrame = m; else break; }

    const dots = g.selectAll<SVGCircleElement, MaterialItem>('.mat-dot')
      .data(all, d => d.id)
      .enter()
      .append('circle')
      .attr('class', 'timeline-marker-dot mat-dot')
      .attr('cx', d => xScale(new Date(d.timestamp)))
      .attr('cy', d => materialY(d) * INNER_H)
      .attr('r', d => materialRadius(d, selectedId === d.id, currentFrame?.id === d.id))
      .attr('fill', d => materialColor(d, selectedId === d.id, currentFrame?.id === d.id))
      .attr('stroke', d => {
        if (selectedId === d.id) return '#fff9c4';
        if (d.attachmentMeta?.isLate || d.fillsGapId) return 'rgba(255,255,255,0.2)';
        return 'rgba(10,22,40,0.8)';
      })
      .attr('stroke-width', d => (selectedId === d.id || currentFrame?.id === d.id) ? 1.5 : 0.8)
      .style('filter', d => {
        if (selectedId === d.id) return 'drop-shadow(0 0 6px rgba(255,217,61,0.9))';
        if (currentFrame?.id === d.id) return 'drop-shadow(0 0 5px rgba(255,217,61,0.8))';
        if (d.attachmentMeta?.isLate) return 'drop-shadow(0 0 4px rgba(255,122,69,0.7))';
        if (d.fillsGapId) return 'drop-shadow(0 0 4px rgba(255,77,79,0.7))';
        return null;
      })
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(120).attr('r', 7);
        const cx = xScale(new Date(d.timestamp));
        const cy = materialY(d) * INNER_H;
        const tip = g.append('g').attr('class', '__tip').attr('pointer-events', 'none');
        tip.append('rect')
          .attr('x', cx + 10).attr('y', cy - 34)
          .attr('width', Math.min(320, d.name.length * 14 + 20))
          .attr('height', 28).attr('rx', 3)
          .attr('fill', 'rgba(10,22,40,0.95)').attr('stroke', materialColor(d, false, false));
        tip.append('text')
          .attr('x', cx + 20).attr('y', cy - 16)
          .attr('font-size', 11).attr('fill', '#C9E4FF')
          .attr('font-family', '"Noto Sans SC", sans-serif')
          .text(`${d.timestamp.slice(11, 16)} · ${d.name}`);
      })
      .on('mouseleave', function () {
        d3.select(this).transition().duration(120)
          .attr('r', (d: any) => materialRadius(d, selectedId === d.id, currentFrame?.id === d.id));
        g.selectAll('.__tip').remove();
      })
      .on('click', (event, d) => {
        selectMaterial(d.id);
        setSidebarTab(d.type === 'point' ? 'points' : d.type === 'attachment' ? 'attachments' : 'orals');
      });

    // 当前帧连接到 playhead 的竖线
    if (currentFrame) {
      const fcx = xScale(new Date(currentFrame.timestamp));
      const fcy = materialY(currentFrame) * INNER_H;
      g.append('line')
        .attr('x1', fcx).attr('x2', fcx)
        .attr('y1', fcy).attr('y2', -6)
        .attr('stroke', '#FFD93D').attr('stroke-width', 1).attr('stroke-dasharray', '2 3')
        .attr('opacity', 0.7);
    }

    // 播放头 (playhead) —— 点击拖动
    const phG = g.append('g').attr('class', 'playhead-group').style('cursor', 'ew-resize');
    const phX = Math.max(0, Math.min(INNER_W, xScale(new Date(currentTime))));
    phG.append('line').attr('class', 'timeline-playhead')
      .attr('x1', phX).attr('x2', phX).attr('y1', -10).attr('y2', INNER_H + 8);
    phG.append('polygon')
      .attr('points', `${phX - 7},-12 ${phX + 7},-12 ${phX},-2`)
      .attr('fill', '#FFD93D').attr('stroke', '#FDE68A').attr('stroke-width', 1)
      .style('filter', 'drop-shadow(0 0 4px rgba(255,217,61,0.8))');
    phG.append('rect')
      .attr('x', phX + 6).attr('y', -12)
      .attr('width', 80).attr('height', 20).attr('rx', 3)
      .attr('fill', 'rgba(255,217,61,0.12)').attr('stroke', 'rgba(255,217,61,0.5)');
    phG.append('text')
      .attr('x', phX + 14).attr('y', 2)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 11).attr('font-weight', 700).attr('fill', '#FFD93D')
      .text(d3.timeFormat('%H:%M:%S')(new Date(currentTime)));

    // 背景点击定位时间
    const hitArea = g.append('rect').attr('x', 0).attr('y', -20)
      .attr('width', INNER_W).attr('height', INNER_H + 24)
      .attr('fill', 'transparent').style('cursor', 'crosshair').lower();

    const setTimeFromX = (mx: number) => {
      const dx = Math.max(0, Math.min(INNER_W, mx));
      const t = xScale.invert(dx);
      const iso = new Date(Math.round(t.getTime() / 15000) * 15000).toISOString();
      const dt = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${filter.dateRange.start.slice(0, 10)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
      setCurrentTime(stamp);
    };

    hitArea.on('mousedown', (event) => {
      dragRef.current.dragging = true;
      const [mx] = d3.pointer(event, g.node() as any);
      setTimeFromX(mx);
    });
    const svgNode = svgRef.current!;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const rect = svgNode.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W - M.left;
      setTimeFromX(mx);
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [all, gaps, domain, currentTime, selectedId, filter.dateRange.start, selectMaterial, setCurrentTime, setSidebarTab]);

  const jump = (deltaMinutes: number) => {
    const t = new Date(currentTime).getTime() + deltaMinutes * 60_000;
    const start = domain[0].getTime(), end = domain[1].getTime();
    const nt = new Date(Math.max(start, Math.min(end, t)));
    const pad = (n: number) => String(n).padStart(2, '0');
    setCurrentTime(`${filter.dateRange.start.slice(0, 10)} ${pad(nt.getHours())}:${pad(nt.getMinutes())}:${pad(nt.getSeconds())}`);
  };

  return (
    <div className="aero-panel p-3 aero-corner relative">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-aero-line" />
          <span className="text-[12px] font-semibold tracking-wider text-aero-text">时间轴 · TIMELINE</span>
          <span className="font-mono text-[10px] text-aero-muted">
            点击拖动播放头 · 双击点位跳转 · 红色斜线=缺段
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 aero-panel-inner p-1 rounded border border-aero-border/60">
            <button className="aero-btn !py-1 !px-2 text-[11px]" onClick={() => jump(-15)} title="后退15分钟">
              <SkipBack size={13} />
            </button>
            <button
              className={`aero-btn !py-1 !px-2.5 text-[11px] ${isPlaying ? '!bg-aero-track/20 !text-aero-track !border-aero-track/60' : 'aero-btn-primary'}`}
              onClick={togglePlay}
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
              <span className="font-mono">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button className="aero-btn !py-1 !px-2 text-[11px]" onClick={() => jump(15)} title="前进15分钟">
              <SkipForward size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1 aero-panel-inner p-1 rounded border border-aero-border/60">
            <span className="text-[10px] font-mono text-aero-muted px-1.5">SPEED</span>
            {[0.5, 1, 2, 4, 8].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  speed === s ? 'bg-aero-line/25 text-aero-line border border-aero-line/50' : 'text-aero-muted hover:text-aero-text border border-transparent'
                }`}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
             style={{ width: '100%', minWidth: 900, height: H, display: 'block' }} />
      </div>
    </div>
  );
};
