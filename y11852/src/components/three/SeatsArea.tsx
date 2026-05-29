import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { useDataStore } from '@/store/useDataStore';
import { getFrequencyColor, getMetricName, getMetricUnit } from '@/engine/acoustics';
import { getIssueTypeName } from '@/engine/acoustics';
import type { HeatMapMetric, FrequencyBand } from '@/types/acoustics';
import { AlertTriangle, Eye } from 'lucide-react';

const getHeatMapColor = (value: number | null, metric: HeatMapMetric): string => {
  if (value === null) return '#52525b';

  const ranges: Record<HeatMapMetric, [number, number]> = {
    rt60: [0.5, 3],
    spl: [60, 95],
    c80: [0, 15],
  };

  const [min, max] = ranges[metric];
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const colors = [
    { pos: 0, color: [59, 130, 246] },
    { pos: 0.5, color: [34, 197, 94] },
    { pos: 0.75, color: [251, 191, 36] },
    { pos: 1, color: [239, 68, 68] },
  ];

  for (let i = 0; i < colors.length - 1; i++) {
    if (normalized <= colors[i + 1].pos) {
      const range = colors[i + 1].pos - colors[i].pos;
      const t = (normalized - colors[i].pos) / range;
      const r = Math.round(colors[i].color[0] + (colors[i + 1].color[0] - colors[i].color[0]) * t);
      const g = Math.round(colors[i].color[1] + (colors[i + 1].color[1] - colors[i].color[1]) * t);
      const b = Math.round(colors[i].color[2] + (colors[i + 1].color[2] - colors[i].color[2]) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  return `rgb(${colors[colors.length - 1].color.join(', ')})`;
};

export const SeatsArea = () => {
  const {
    showSeats,
    seatScale,
    selectedSeatId,
    hoveredSeatId,
    setSelectedSeatId,
    setHoveredSeatId,
  } = useSceneStore();

  const { seats, heatMapMetric, activeFrequencyBand, filters } = useDataStore();

  const filteredSeats = useMemo(() => {
    let result = [...seats];

    if (filters.showOnlyIssues) {
      result = result.filter((seat) => seat.issues.length > 0);
    }

    if (filters.issueTypes.length > 0) {
      result = result.filter((seat) =>
        seat.issues.some((issue) => filters.issueTypes.includes(issue))
      );
    }

    if (filters.selectedSeatIds.length > 0) {
      result = result.filter((seat) => filters.selectedSeatIds.includes(seat.id));
    }

    return result;
  }, [seats, filters]);

  const handleSeatClick = useCallback((seatId: string) => {
    setSelectedSeatId(selectedSeatId === seatId ? null : seatId);
    if (selectedSeatId !== seatId) {
      const seat = seats.find((s) => s.id === seatId);
      if (seat) {
        setHoveredSeatId(seatId);
      }
    }
  }, [selectedSeatId, setSelectedSeatId, setHoveredSeatId, seats]);

  const handleSeatHover = useCallback((seatId: string | null) => {
    setHoveredSeatId(seatId);
  }, [setHoveredSeatId]);

  const getSeatColor = useCallback((seat: typeof seats[0]): string => {
    if (seat.issues.length > 0 && filters.issueTypes.length === 0) {
      return seat.isOccluded ? '#EF4444' : '#F59E0B';
    }

    const ac = seat.acoustics[activeFrequencyBand];
    if (ac.hasError) return '#EF4444';

    const value = ac[heatMapMetric];
    return getHeatMapColor(value, heatMapMetric);
  }, [activeFrequencyBand, heatMapMetric, filters.issueTypes]);

  if (!showSeats || filteredSeats.length === 0) return null;

  return (
    <group>
      {filteredSeats.map((seat) => {
        const isSelected = selectedSeatId === seat.id;
        const isHovered = hoveredSeatId === seat.id;
        const color = getSeatColor(seat);
        const baseScale = 0.35 * seatScale;
        const scale = isSelected ? baseScale * 1.4 : isHovered ? baseScale * 1.2 : baseScale;

        return (
          <group
            key={seat.id}
            position={[seat.position.x, seat.position.y, seat.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              handleSeatClick(seat.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              handleSeatHover(seat.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              handleSeatHover(null);
              document.body.style.cursor = 'default';
            }}
          >
            <mesh scale={scale}>
              <boxGeometry args={[0.8, 0.1, 0.7]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected || isHovered ? color : '#000000'}
                emissiveIntensity={(isSelected || isHovered) ? 0.3 : 0}
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>

            <mesh position={[0, 0.15, 0]} scale={scale * 0.8}>
              <boxGeometry args={[0.7, 0.4, 0.1]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected || isHovered ? color : '#000000'}
                emissiveIntensity={(isSelected || isHovered) ? 0.2 : 0}
                roughness={0.6}
                metalness={0.1}
              />
            </mesh>

            {(isSelected || isHovered) && (
              <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.55, 32]} />
                <meshBasicMaterial color={getFrequencyColor(activeFrequencyBand)} transparent opacity={0.8} />
              </mesh>
            )}

            {seat.issues.length > 0 && (
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshBasicMaterial
                  color={seat.isOccluded ? '#EF4444' : '#F59E0B'}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            )}

            {isSelected && (
              <Html
                center
                distanceFactor={6}
                position={[0, 1.2, 0]}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-3 min-w-[180px] shadow-2xl">
                  <div className="text-xs font-bold text-zinc-100 mb-2">
                    座位 {seat.row + 1}排 {seat.col + 1}座
                  </div>

                  {seat.issues.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {seat.issues.map((issue) => (
                        <span
                          key={issue}
                          className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                          style={{
                            backgroundColor: issue === 'seat_occluded' ? '#fef2f2' : '#fef3c7',
                            color: issue === 'seat_occluded' ? '#dc2626' : '#d97706',
                          }}
                        >
                          <AlertTriangle size={10} />
                          {getIssueTypeName(issue)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    {(['low', 'mid', 'high'] as FrequencyBand[]).map((band) => {
                      const ac = seat.acoustics[band];
                      return (
                        <div
                          key={band}
                          className={`text-[10px] flex justify-between items-center px-1.5 py-1 rounded ${
                            band === activeFrequencyBand ? 'bg-zinc-800' : ''
                          }`}
                        >
                          <span
                            className="font-medium"
                            style={{ color: getFrequencyColor(band) }}
                          >
                            {band === 'low' ? '低频' : band === 'mid' ? '中频' : '高频'}
                          </span>
                          <span className="text-zinc-400 font-mono">
                            RT60: {ac.rt60?.toFixed(2) || '--'}s
                          </span>
                          <span className="text-zinc-400 font-mono">
                            SPL: {ac.spl?.toFixed(1) || '--'}dB
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-700 text-[10px] text-zinc-500 flex items-center gap-1">
                    <Eye size={10} />
                    {seat.isOccluded ? '存在视线遮挡' : '视线良好'}
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
