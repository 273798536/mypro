import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { Hotspot } from '@/types';

function parseCoordinate(raw: number | null | string | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return isFinite(raw) ? raw : null;
  }
  if (typeof raw === 'string') {
    const m = raw.match(/-?\d+(\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return isFinite(n) ? n : null;
  }
  return null;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const { hotspots, mapConfig, detections, status } = useCanvasStore();

  const isInteractive = status === 'running';

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapConfig) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = mapConfig.width;
    const height = mapConfig.height;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const drawnHotspots: { id: string; x: number; y: number; radius: number; label: string; value: number; hasError: boolean; hasWarning: boolean }[] = [];

    hotspots.forEach((hotspot: Hotspot) => {
      const x = parseCoordinate(hotspot.x);
      const y = parseCoordinate(hotspot.y);
      if (x === null || y === null) return;

      const hotspotDetections = detections.filter(d => d.hotspotId === hotspot.id);
      const hasError = hotspotDetections.some(d => d.severity === 'error');
      const hasWarning = hotspotDetections.some(d => d.severity === 'warning');

      const baseRadius = Math.max(12, Math.min(36, hotspot.value / 2.2));
      const radius = selectedHotspot === hotspot.id ? baseRadius + 6 : baseRadius;

      if (hasError) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
      } else if (hasWarning) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.55)';
      } else {
        const intensity = Math.min(1, Math.max(0, hotspot.value / 100));
        ctx.fillStyle = `rgba(99, 102, 241, ${0.35 + intensity * 0.45})`;
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (selectedHotspot === hotspot.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (hasError) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (hasWarning) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hotspot.label, x, y - radius - 6);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillText(`${hotspot.value}`, x, y + 4);

      drawnHotspots.push({ id: hotspot.id, x, y, radius, label: hotspot.label, value: hotspot.value, hasError, hasWarning });
    });

    (canvas as any)._drawnHotspots = drawnHotspots;

    if (mapConfig.scale && mapConfig.scale > 0 && mapConfig.scaleUnit) {
      const scaleLength = 50;
      const startX = 20;
      const startY = height - 20;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + scaleLength, startY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, startY - 5);
      ctx.lineTo(startX, startY + 5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX + scaleLength, startY - 5);
      ctx.lineTo(startX + scaleLength, startY + 5);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${(mapConfig.scale * scaleLength).toFixed(0)} ${mapConfig.scaleUnit}`,
        startX + scaleLength / 2,
        startY - 10
      );
    } else {
      const startX = 20;
      const startY = height - 20;
      ctx.fillStyle = '#F87171';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⚠ 比例尺未标注或无效', startX, startY);
    }

    if (status === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('已暂停', width / 2, height / 2);
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('点击"继续"恢复操作', width / 2, height / 2 + 24);
    }

    if (status === 'settled') {
      ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('已结算', width / 2, height / 2);
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#BFDBFE';
      ctx.fillText('前往"复盘"查看完整报告', width / 2, height / 2 + 24);
    }
  }, [hotspots, mapConfig, detections, selectedHotspot, status]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !mapConfig) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const drawn: any[] = (canvas as any)._drawnHotspots || [];

    let clicked: string | null = null;
    for (let i = drawn.length - 1; i >= 0; i--) {
      const h = drawn[i];
      const dist = Math.sqrt(Math.pow(x - h.x, 2) + Math.pow(y - h.y, 2));
      if (dist <= h.radius + 4) {
        clicked = h.id;
        break;
      }
    }
    setSelectedHotspot(clicked);
  };

  if (!mapConfig) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-900 rounded-lg border border-slate-700">
        <p className="text-slate-400 text-sm">请先在上方选择样例数据</p>
      </div>
    );
  }

  const selected = selectedHotspot ? hotspots.find(h => h.id === selectedHotspot) : null;
  const selectedDetections = selectedHotspot ? detections.filter(d => d.hotspotId === selectedHotspot) : [];

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`rounded-lg shadow-lg w-full ${
          isInteractive ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
        style={{ imageRendering: 'auto' }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-indigo-400/70 inline-block"></span>
          <span className="text-slate-300">正常热点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400/70 inline-block"></span>
          <span className="text-slate-300">待确认 (warning)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400/70 inline-block"></span>
          <span className="text-slate-300">错误 (error)</span>
        </div>
        <div className="ml-auto text-slate-400">
          底图: {mapConfig.name} · {mapConfig.width}×{mapConfig.height}
        </div>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 bg-slate-800/95 backdrop-blur border border-slate-600 p-3 rounded-lg shadow-xl min-w-[220px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-sm font-semibold">{selected.label}</p>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-300 text-xs">
            坐标: ({String(selected.x)}, {String(selected.y)})
          </p>
          <p className="text-slate-300 text-xs">热度值: {selected.value}</p>
          {selected.notes && (
            <p className="text-yellow-300 text-xs mt-1">备注: {selected.notes}</p>
          )}
          {selectedDetections.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-600 space-y-1">
              <p className="text-slate-400 text-xs font-medium">检测问题:</p>
              {selectedDetections.map(d => (
                <p
                  key={d.id}
                  className="text-xs leading-relaxed"
                  style={{
                    color: d.severity === 'error' ? '#F87171' :
                           d.severity === 'warning' ? '#FBBF24' : '#34D399'
                  }}
                >
                  • {d.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
