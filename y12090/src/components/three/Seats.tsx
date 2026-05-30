import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Seat } from '../../types/seat';
import type { OcclusionResult, OcclusionType } from '../../types/occlusion';
import { OCCLUSION_TYPE_COLORS } from '../../types/occlusion';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';

interface SeatsProps {
  seats: Seat[];
  occlusionResults: OcclusionResult[];
  onSeatClick: (seatId: string) => void;
}

export const Seats: React.FC<SeatsProps> = ({ seats, occlusionResults, onSeatClick }) => {
  const selectedSeatId = useDataStore((state) => state.selectedSeatId);
  const { occlusionFilter, seatFilter, showOnlySelected } = useFilterStore();

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
    return seats.filter((seat) => {
      if (showOnlySelected && seat.id !== selectedSeatId) {
        return false;
      }

      if (seatFilter.sections.length > 0 && !seatFilter.sections.includes(seat.section)) {
        return false;
      }
      if (seatFilter.rows.length > 0 && !seatFilter.rows.includes(seat.row)) {
        return false;
      }
      if (seatFilter.seatNumbers.length > 0 && !seatFilter.seatNumbers.includes(seat.number)) {
        return false;
      }

      const occlusion = seatOcclusionMap.get(seat.id);
      if (occlusion) {
        if (
          occlusionFilter.types.length > 0 &&
          !occlusionFilter.types.includes(occlusion.type)
        ) {
          return false;
        }
        if (
          occlusionFilter.severities.length > 0 &&
          !occlusionFilter.severities.includes(occlusion.severity)
        ) {
          return false;
        }
        if (
          occlusionFilter.sources.length > 0 &&
          !occlusionFilter.sources.includes(occlusion.source)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [seats, seatOcclusionMap, selectedSeatId, showOnlySelected, occlusionFilter, seatFilter]);

  const seatColor = useMemo(() => {
    return (seatId: string, isSelected: boolean): string => {
      if (isSelected) return '#FBBF24';
      const occlusion = seatOcclusionMap.get(seatId);
      return occlusion ? OCCLUSION_TYPE_COLORS[occlusion.type] : OCCLUSION_TYPE_COLORS.normal;
    };
  }, [seatOcclusionMap]);

  return (
    <group>
      {visibleSeats.map((seat) => {
        const isSelected = seat.id === selectedSeatId;
        const color = seatColor(seat.id, isSelected);

        return (
          <group
            key={seat.id}
            position={[seat.position.x, seat.position.y, seat.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSeatClick(seat.id);
            }}
          >
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.5, 0.4, 0.5]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected ? color : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
              />
            </mesh>

            <mesh position={[0, 0.6, -0.2]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.5, 0.5, 0.08]} />
              <meshStandardMaterial
                color={color}
                emissive={isSelected ? color : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : 0}
              />
            </mesh>

            {isSelected && (
              <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#FBBF24" transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
