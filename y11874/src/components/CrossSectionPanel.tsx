import { useRef, useEffect, useCallback } from 'react';
import { Scissors, X } from 'lucide-react';
import { useSurfaceStore } from '@/store/useSurfaceStore';
import type { CrossSectionDirection } from '@/types';

export default function CrossSectionPanel() {
  const showCrossSection = useSurfaceStore((s) => s.showCrossSection);
  const crossSection = useSurfaceStore((s) => s.crossSection);
  const crossSectionDirection = useSurfaceStore((s) => s.crossSectionDirection);
  const crossSectionPosition = useSurfaceStore((s) => s.crossSectionPosition);
  const config = useSurfaceStore((s) => s.config);
  const toggleCrossSection = useSurfaceStore((s) => s.toggleCrossSection);
  const setCrossSectionDirection = useSurfaceStore((s) => s.setCrossSectionDirection);
  const setCrossSectionPosition = useSurfaceStore((s) => s.setCrossSectionPosition);
  const recomputeCrossSection = useSurfaceStore((s) => s.recomputeCrossSection);
  const recompute = useSurfaceStore((s) => s.recompute);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showCrossSection) recomputeCrossSection();
  }, [crossSectionDirection, crossSectionPosition, showCrossSection, recomputeCrossSection]);

  useEffect(() => {
    if (!canvasRef.current || !crossSection || crossSection.points.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, w, h);

    const pts = crossSection.points;
    const xMin = pts[0][0];
    const xMax = pts[pts.length - 1][0];
    let yMin = Infinity, yMax = -Infinity;
    for (const [, y] of pts) {
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const pad = 30;

    const toCanvasX = (x: number) => pad + ((x - xMin) / xRange) * (w - 2 * pad);
    const toCanvasY = (y: number) => h - pad - ((y - yMin) / yRange) * (h - 2 * pad);

    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const gy = pad + (i / 5) * (h - 2 * pad);
      ctx.beginPath();
      ctx.moveTo(pad, gy);
      ctx.lineTo(w - pad, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = '#00e5c8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5c8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const cx = toCanvasX(pts[i][0]);
      const cy = toCanvasY(pts[i][1]);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#4a5568';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const x = xMin + (i / 4) * xRange;
      ctx.fillText(x.toFixed(1), toCanvasX(x), h - pad + 14);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = yMin + (i / 4) * yRange;
      ctx.fillText(y.toFixed(1), pad - 4, toCanvasY(y) + 3);
    }

    const dirLabel = crossSectionDirection === 'xz' ? `y = ${crossSectionPosition.toFixed(1)}` :
      crossSectionDirection === 'yz' ? `x = ${crossSectionPosition.toFixed(1)}` :
      `z = ${crossSectionPosition.toFixed(1)}`;
    ctx.fillStyle = '#00e5c8';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(dirLabel, pad + 4, pad - 8);
  }, [crossSection, crossSectionDirection, crossSectionPosition]);

  const handleDirectionChange = useCallback((dir: CrossSectionDirection) => {
    setCrossSectionDirection(dir);
  }, [setCrossSectionDirection]);

  const handlePositionChange = useCallback((pos: number) => {
    setCrossSectionPosition(pos);
  }, [setCrossSectionPosition]);

  const range = crossSectionDirection === 'xz' ? config.yRange :
    crossSectionDirection === 'yz' ? config.xRange : config.zRange;

  const directions: { key: CrossSectionDirection; label: string }[] = [
    { key: 'xz', label: 'XZ (固定Y)' },
    { key: 'yz', label: 'YZ (固定X)' },
    { key: 'xy', label: 'XY (固定Z)' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5c8] uppercase tracking-wider">
          <Scissors size={16} />
          剖面
        </div>
        <button
          onClick={toggleCrossSection}
          className={`px-2 py-1 rounded text-xs transition-all ${
            showCrossSection
              ? 'bg-[#00e5c8]/20 text-[#00e5c8] border border-[#00e5c8]/30'
              : 'bg-[#0d1520] text-gray-500 border border-[#1a2a3a]'
          }`}
        >
          {showCrossSection ? '开启' : '关闭'}
        </button>
      </div>

      {showCrossSection && (
        <>
          <div className="flex gap-1">
            {directions.map((d) => (
              <button
                key={d.key}
                onClick={() => handleDirectionChange(d.key)}
                className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                  crossSectionDirection === d.key
                    ? 'bg-[#00e5c8]/15 text-[#00e5c8] border border-[#00e5c8]/30'
                    : 'bg-[#0d1520] text-gray-500 border border-[#1a2a3a] hover:text-gray-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs text-gray-400">剖面位置</label>
              <span className="text-xs font-mono text-[#00e5c8]">{crossSectionPosition.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={range[0]}
              max={range[1]}
              step={0.01}
              value={crossSectionPosition}
              onChange={(e) => handlePositionChange(Number(e.target.value))}
              className="w-full h-1.5 bg-[#1a2a3a] rounded-full appearance-none cursor-pointer accent-[#00e5c8]"
            />
          </div>

          <div className="bg-[#060a14] border border-[#1a2a3a] rounded-lg overflow-hidden">
            <canvas ref={canvasRef} width={320} height={180} className="w-full" />
          </div>
        </>
      )}
    </div>
  );
}
