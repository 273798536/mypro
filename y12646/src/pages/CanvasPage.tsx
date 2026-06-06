import { useRef, useState, useEffect } from 'react';
import CanvasToolbar from '@/components/CanvasToolbar';
import AcupointPanel from '@/components/AcupointPanel';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Layers,
  Filter,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function CanvasPage() {
  const {
    batch,
    acupoints,
    canvas,
    setSelectedAcupoint,
    setCanvasZoom,
    setCanvasPan,
  } = useAppStore();

  const [hoveredAcupointId, setHoveredAcupointId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const selectedAcupoint = acupoints.find(
    (a) => a.id === canvas.selectedAcupointId
  );

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setCanvasZoom(canvas.zoom + delta);
  }

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: canvas.panX,
      panY: canvas.panY,
    };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setCanvasPan(dragStart.current.panX + dx, dragStart.current.panY + dy);
  }

  useEffect(() => {
    function onUp() {
      isDragging.current = false;
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  const boundaryRadius = 18;

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="p-4 pb-2 flex items-center justify-between gap-4">
        <CanvasToolbar />
        <div className="flex items-center gap-2">
          <button className="btn-ghost">
            <Filter className="w-4 h-4" strokeWidth={1.8} />
            <span>筛选轨迹</span>
          </button>
          <button className="btn-ghost">
            <Layers className="w-4 h-4" strokeWidth={1.8} />
            <span>图层</span>
            <ChevronRight className="w-3.5 h-3.5 -ml-1" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-3 px-4 pb-4 min-h-0">
        <div
          ref={containerRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          className="flex-1 relative rounded-2xl overflow-hidden border border-ink-100 bg-white shadow-soft cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage:
              'linear-gradient(135deg, #fdfbf7 0%, #f6f9fc 100%)',
          }}
        >
          {canvas.showGrid && (
            <div
              className="absolute inset-0 bg-grid-med bg-grid-med pointer-events-none"
              style={{ opacity: 0.7 }}
            />
          )}

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translate(${canvas.panX}px, ${canvas.panY}px) scale(${canvas.zoom})`,
              transformOrigin: 'center center',
              transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
            }}
          >
            <svg
              viewBox="0 0 600 780"
              width={600}
              height={780}
              className="select-none"
            >
              <defs>
                <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#eef2f7" />
                  <stop offset="100%" stopColor="#d9dee6" />
                </radialGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#072949" floodOpacity="0.1" />
                </filter>
              </defs>

              <g opacity={batch.layers.find(l => l.id === 'layer-001')?.opacity ?? 1}>
                <BodyOutline />
                <MeridianLines />
              </g>

              {canvas.showBoundaries && (
                <g>
                  {acupoints.map((ap) => (
                    <circle
                      key={`boundary-${ap.id}`}
                      cx={ap.position.x}
                      cy={ap.position.y}
                      r={boundaryRadius}
                      fill="rgba(12, 142, 232, 0.04)"
                      stroke="rgba(12, 142, 232, 0.25)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  ))}
                </g>
              )}

              <g>
                {batch.trajectories.map((traj) => {
                  const color =
                    traj.accuracy >= 0.8 ? '#50916b' : traj.accuracy >= 0.65 ? '#d67637' : '#ef4444';
                  const d = traj.points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');
                  const selected =
                    canvas.selectedTrajectoryId === traj.id ||
                    canvas.selectedAcupointId === traj.acupointId;
                  return (
                    <g key={traj.id} opacity={selected ? 1 : 0.55}>
                      <path
                        d={d}
                        fill="none"
                        stroke={color}
                        strokeWidth={selected ? 3 : 2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {traj.points.length > 0 && (
                        <>
                          <circle
                            cx={traj.points[0].x}
                            cy={traj.points[0].y}
                            r={selected ? 4.5 : 3}
                            fill={color}
                          />
                          <circle
                            cx={traj.points[traj.points.length - 1].x}
                            cy={traj.points[traj.points.length - 1].y}
                            r={selected ? 4.5 : 3}
                            fill={color}
                            stroke="white"
                            strokeWidth={1.5}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>

              <g>
                {acupoints.map((ap) => {
                  const selected = canvas.selectedAcupointId === ap.id;
                  const hovered = hoveredAcupointId === ap.id;
                  return (
                    <g
                      key={ap.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAcupoint(selected ? null : ap.id);
                      }}
                      onMouseEnter={() => setHoveredAcupointId(ap.id)}
                      onMouseLeave={() => setHoveredAcupointId(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={ap.position.x}
                        cy={ap.position.y}
                        r={selected || hovered ? 10 : 7}
                        fill={selected ? '#0c8ee8' : 'white'}
                        stroke={selected ? '#0071c6' : '#0c8ee8'}
                        strokeWidth={selected ? 3 : 2}
                        className="transition-all duration-200"
                        style={{
                          filter: selected || hovered ? 'drop-shadow(0 2px 6px rgba(12, 142, 232, 0.4))' : 'none',
                        }}
                      />
                      {(selected || hovered) && (
                        <g>
                          <rect
                            x={ap.position.x + 12}
                            y={ap.position.y - 22}
                            width={ap.name.length * 14 + 16}
                            height={22}
                            rx={6}
                            fill="#0b416e"
                          />
                          <text
                            x={ap.position.x + 20}
                            y={ap.position.y - 6}
                            fill="white"
                            fontSize={12}
                            fontWeight={600}
                          >
                            {ap.name}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              <g>
                {batch.anomalies.filter(a => a.changedResult).map((a) => (
                  <g
                    key={a.id}
                    transform={`translate(${a.location.x}, ${a.location.y})`}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={14}
                      fill="rgba(239, 68, 68, 0.12)"
                      stroke="rgba(239, 68, 68, 0.6)"
                      strokeWidth={1.5}
                      className="animate-pulse-soft"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={6}
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </g>
            </svg>
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-ink-100 shadow-soft flex items-center gap-3 text-xs">
              <Legend color="#50916b" label="≥80% 优秀" />
              <Legend color="#d67637" label="65~80% 良好" />
              <Legend color="#ef4444" label="<65% 待改进" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-ink-100 shadow-soft flex items-center gap-2 text-xs text-ink-500">
              <Info className="w-3.5 h-3.5" />
              点击穴位查看详情 · 滚轮缩放 · 拖拽平移
            </div>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-red-50/95 backdrop-blur border border-red-100 shadow-soft flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-red-700 font-medium">
                {batch.anomalies.filter(a => a.changedResult).length} 项异常已改变判定
              </span>
            </div>
          </div>
        </div>

        {selectedAcupoint && (
          <AcupointPanel
            acupoint={selectedAcupoint}
            onClose={() => setSelectedAcupoint(null)}
          />
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-ink-600">{label}</span>
    </div>
  );
}

function BodyOutline() {
  return (
    <g fill="url(#bodyGrad)" stroke="#9aa6b3" strokeWidth={1.5} filter="url(#softShadow)">
      <ellipse cx="300" cy="75" rx="48" ry="52" />
      <path d="M252 115 Q248 138 255 160 L230 200 Q218 225 228 260 L200 380 Q192 408 205 430 L200 520 L180 600 Q172 640 185 680 Q200 700 215 700 L260 700 L265 540 L290 540 L290 700 L310 700 L310 540 L335 540 L340 700 L385 700 Q400 700 415 680 Q428 640 420 600 L400 520 L395 430 Q408 408 400 380 L372 260 Q382 225 370 200 L345 160 Q352 138 348 115 Z" />
      <path d="M228 260 Q170 280 150 340 Q140 370 155 385 L180 375 Q182 345 200 325 L215 295 Z" />
      <path d="M372 260 Q430 280 450 340 Q460 370 445 385 L420 375 Q418 345 400 325 L385 295 Z" />
    </g>
  );
}

function MeridianLines() {
  return (
    <g fill="none" stroke="rgba(12, 142, 232, 0.35)" strokeWidth={1.4} strokeDasharray="4 3">
      <path d="M300 30 L300 130" />
      <path d="M300 130 L300 220 L300 460" />
      <path d="M260 130 Q240 150 228 200" />
      <path d="M340 130 Q360 150 372 200" />
      <path d="M255 260 Q230 300 210 380" />
      <path d="M345 260 Q370 300 390 380" />
      <path d="M280 280 L270 460 L265 700" />
      <path d="M320 280 L330 460 L335 700" />
    </g>
  );
}
