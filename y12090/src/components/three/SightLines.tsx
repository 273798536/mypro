import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Seat } from '../../types/seat';
import type { OcclusionResult } from '../../types/occlusion';
import { OCCLUSION_TYPE_COLORS } from '../../types/occlusion';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';

interface SightLinesProps {
  seats: Seat[];
  occlusionResults: OcclusionResult[];
}

export const SightLines: React.FC<SightLinesProps> = ({ seats, occlusionResults }) => {
  const selectedSeatId = useDataStore((state) => state.selectedSeatId);
  const { showSightLines, showOnlySelected } = useFilterStore();

  const seatOcclusionMap = useMemo(() => {
    const map = new Map<string, OcclusionResult>();
    for (const result of occlusionResults) {
      if (!map.has(result.seatId) || result.type !== 'normal') {
        map.set(result.seatId, result);
      }
    }
    return map;
  }, [occlusionResults]);

  const visibleSeats = useMemo(() => {
    if (!showSightLines) return [];

    if (showOnlySelected && selectedSeatId) {
      return seats.filter((s) => s.id === selectedSeatId);
    }

    return seats;
  }, [seats, showSightLines, showOnlySelected, selectedSeatId]);

  const linesData = useMemo(() => {
    return visibleSeats.map((seat) => {
      const occlusion = seatOcclusionMap.get(seat.id);
      const color = occlusion
        ? OCCLUSION_TYPE_COLORS[occlusion.type]
        : OCCLUSION_TYPE_COLORS.normal;
      const isSelected = seat.id === selectedSeatId;

      const start: [number, number, number] = [
        seat.position.x,
        seat.position.y + seat.eyeHeight,
        seat.position.z,
      ];

      const end: [number, number, number] = [
        seat.targetPoint.x,
        seat.targetPoint.y,
        seat.targetPoint.z,
      ];

      return { start, end, color, isSelected, seatId: seat.id };
    });
  }, [visibleSeats, seatOcclusionMap, selectedSeatId]);

  return (
    <group>
      {linesData.map((line) => (
        <Line
          key={`line-${line.seatId}`}
          points={[line.start, line.end]}
          color={line.color}
          transparent
          opacity={line.isSelected ? 1 : 0.6}
          lineWidth={line.isSelected ? 2 : 1}
        />
      ))}

      {linesData.map((line) => (
        <mesh key={`start-${line.seatId}`} position={line.start}>
          <sphereGeometry args={[line.isSelected ? 0.08 : 0.05, 8, 8]} />
          <meshBasicMaterial color={line.color} />
        </mesh>
      ))}

      {linesData.map((line) => (
        <mesh key={`end-${line.seatId}`} position={line.end}>
          <sphereGeometry args={[line.isSelected ? 0.1 : 0.05, 8, 8]} />
          <meshBasicMaterial color={line.color} />
        </mesh>
      ))}
    </group>
  );
};
