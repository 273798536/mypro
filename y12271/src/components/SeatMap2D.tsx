import { useCallback, useMemo, useRef, useState } from 'react';
import { useHallStore } from '@/stores/useHallStore';
import { useAnomalyStore } from '@/stores/useAnomalyStore';
import { useCorrectionStore } from '@/stores/useCorrectionStore';
import { AlertTriangle, Lock, Activity } from 'lucide-react';

interface SeatMap2DProps {
  snapshotData?: Record<string, number>;
  highlightDiffs?: Set<string>;
  label?: string;
}

export default function SeatMap2D({ snapshotData, highlightDiffs, label }: SeatMap2DProps) {
  const seats = useHallStore((s) => s.seats);
  const soundSources = useHallStore((s) => s.soundSources);
  const selectedSeatId = useHallStore((s) => s.selectedSeatId);
  const selectSeat = useHallStore((s) => s.selectSeat);
  const getReverbColor = useHallStore((s) => s.getReverbColor);
  const selectAnomaly = useAnomalyStore((s) => s.selectAnomaly);
  const isDragMode = useCorrectionStore((s) => s.isDragMode);
  const updateSoundSource = useHallStore((s) => s.updateSoundSource);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const viewBox = useMemo(() => {
    const xs = seats.map((s) => s.x);
    const zs = seats.map((s) => s.z);
    const minX = Math.min(...xs) - 3;
    const maxX = Math.max(...xs) + 3;
    const minZ = Math.min(...zs) - 4;
    const maxZ = Math.max(...zs) + 3;
    return `${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}`;
  }, [seats]);

  const handleSeatClick = useCallback(
    (seatId: string) => {
      selectSeat(seatId);
      selectAnomaly(null);
    },
    [selectSeat, selectAnomaly]
  );

  const handleSourceMouseDown = useCallback(
    (e: React.MouseEvent, srcId: string) => {
      if (!isDragMode || !svgRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgRef.current.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());
      const src = soundSources.find((s) => s.id === srcId);
      if (!src) return;
      dragRef.current = { id: srcId, offsetX: svgPt.x - src.x, offsetY: svgPt.y - src.z };
    },
    [isDragMode, soundSources]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current || !svgRef.current) return;
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgRef.current.getScreenCTM();
      if (!ctm) return;
      const svgPt = pt.matrixTransform(ctm.inverse());
      updateSoundSource(dragRef.current.id, {
        x: Math.round((svgPt.x - dragRef.current.offsetX) * 100) / 100,
        y: 0,
        z: Math.round((svgPt.y - dragRef.current.offsetY) * 100) / 100,
      });
    },
    [updateSoundSource]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const getSeatColor = useCallback(
    (seat: (typeof seats)[0]) => {
      if (snapshotData && snapshotData[seat.id] !== undefined) {
        return getReverbColor(snapshotData[seat.id]);
      }
      return getReverbColor(seat.reverbTime);
    },
    [snapshotData, getReverbColor]
  );

  return (
    <div className="relative w-full h-full bg-[#0A1628] rounded-lg overflow-hidden">
      {label && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-3 py-1 rounded text-xs text-gray-300 font-mono">
          {label}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#EF4444" strokeWidth="1" opacity="0.6" />
          </pattern>
          <pattern id="hatch-snap" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#F59E0B" strokeWidth="1" opacity="0.6" />
          </pattern>
        </defs>

        {seats.map((seat) => {
          const isSelected = seat.id === selectedSeatId;
          const isHovered = seat.id === hoveredSeat;
          const isDiff = highlightDiffs?.has(seat.id);
          const color = getSeatColor(seat);
          const size = 0.32;

          return (
            <g
              key={seat.id}
              onClick={() => handleSeatClick(seat.id)}
              onMouseEnter={() => setHoveredSeat(seat.id)}
              onMouseLeave={() => setHoveredSeat(null)}
              className="cursor-pointer"
            >
              <rect
                x={seat.x - size}
                y={seat.z - size}
                width={size * 2}
                height={size * 2}
                rx={2}
                fill={color}
                stroke={
                  isSelected
                    ? '#FFFFFF'
                    : isDiff
                    ? '#F59E0B'
                    : seat.isOccluded
                    ? '#EF4444'
                    : isHovered
                    ? '#94A3B8'
                    : 'transparent'
                }
                strokeWidth={isSelected || isDiff ? 2 : seat.isOccluded ? 1 : 0.5}
                strokeDasharray={seat.isOccluded ? '3 2' : undefined}
                opacity={snapshotData && snapshotData[seat.id] === undefined ? 0.25 : 0.85}
              />
              {seat.missingParams && (
                <rect
                  x={seat.x - size}
                  y={seat.z - size}
                  width={size * 2}
                  height={size * 2}
                  fill={snapshotData ? 'url(#hatch-snap)' : 'url(#hatch)'}
                  rx={2}
                />
              )}
              {seat.missingParams && (
                <text
                  x={seat.x + size - 0.05}
                  y={seat.z - size + 0.25}
                  fontSize="0.22"
                  fill="#EF4444"
                  textAnchor="end"
                >
                  ⚠
                </text>
              )}
              {seat.isOccluded && (
                <text
                  x={seat.x + size - 0.05}
                  y={seat.z + size - 0.05}
                  fontSize="0.2"
                  fill="#EF4444"
                  textAnchor="end"
                >
                  🔒
                </text>
              )}
              {seat.frequencyBandError && (
                <text
                  x={seat.x - size + 0.08}
                  y={seat.z + size - 0.05}
                  fontSize="0.18"
                  fill="#F59E0B"
                  textAnchor="start"
                >
                  ⚡
                </text>
              )}
            </g>
          );
        })}

        {soundSources.map((src) => (
          <g
            key={src.id}
            onMouseDown={(e) => handleSourceMouseDown(e, src.id)}
            className={isDragMode ? 'cursor-grab' : 'cursor-default'}
          >
            <circle cx={src.x} cy={src.z} r={0.6} fill="#F59E0B" opacity={0.3} />
            <circle cx={src.x} cy={src.z} r={0.35} fill="#F59E0B" stroke="#FFF" strokeWidth={0.08} />
            <text
              x={src.x}
              y={src.z + 0.05}
              fontSize="0.28"
              fill="#000"
              textAnchor="middle"
              dominantBaseline="central"
              fontWeight="bold"
            >
              S
            </text>
          </g>
        ))}

        <text x={0} y={6} fontSize="0.5" fill="#6B7280" textAnchor="middle" opacity={0.5}>
          舞台方向
        </text>
      </svg>

      {hoveredSeat && (() => {
        const seat = seats.find((s) => s.id === hoveredSeat);
        if (!seat) return null;
        return (
          <div className="absolute bottom-3 left-3 bg-black/80 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 pointer-events-none z-20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400">座位</span>
              <span className="text-white font-bold">{seat.row}{seat.number}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400">混响</span>
              <span style={{ color: getReverbColor(seat.reverbTime) }}>{seat.reverbTime.toFixed(2)}s</span>
            </div>
            {seat.missingParams && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={10} /> 缺少吸声参数
              </div>
            )}
            {seat.isOccluded && (
              <div className="flex items-center gap-1 text-red-400">
                <Lock size={10} /> 被挑台遮挡
              </div>
            )}
            {seat.frequencyBandError && (
              <div className="flex items-center gap-1 text-amber-400">
                <Activity size={10} /> 频段数据异常
              </div>
            )}
          </div>
        );
      })()}

      <div className="absolute bottom-3 right-3 bg-black/70 border border-gray-700 rounded-lg px-3 py-2 text-xs z-20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-400">混响时长</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-24 h-2 rounded" style={{ background: 'linear-gradient(to right, #F59E0B, #3B82F6)' }} />
        </div>
        <div className="flex justify-between w-24 text-[10px] text-gray-500 mt-0.5">
          <span>1.2s</span>
          <span>2.8s</span>
        </div>
        <div className="mt-1.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <div className="w-2.5 h-2.5 bg-red-500/30 border border-red-500/50 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(239,68,68,0.4) 1px, rgba(239,68,68,0.4) 2px)' }} /> 缺参
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <div className="w-2.5 h-2.5 border border-red-500/50 rounded-sm border-dashed" /> 遮挡
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="text-amber-400">⚡</span> 频段异常
          </div>
        </div>
      </div>
    </div>
  );
}
