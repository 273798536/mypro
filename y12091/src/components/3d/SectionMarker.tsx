import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { RiverSection, CalculationResult, COLORS } from '../../types';
import { formatElevation } from '../../data/mockData';

interface SectionMarkerProps {
  section: RiverSection;
  result: CalculationResult | null;
  isSelected: boolean;
  onClick: () => void;
  timeIndex: number;
}

export function SectionMarker({ section, result, isSelected, onClick, timeIndex }: SectionMarkerProps) {
  const { avgElevation, avgChange, totalChange } = useMemo(() => {
    const bedChanges = result?.bedChanges[section.id] || [];
    const elevations = result?.sectionElevations[section.id] || section.coordinates.map(c => c[2]);

    const avgElevation = elevations.length > 0
      ? elevations.reduce((a, b) => a + b, 0) / elevations.length
      : section.elevation;

    const avgChange = bedChanges.length > 0
      ? bedChanges.reduce((a, b) => a + b, 0) / bedChanges.length
      : 0;

    const totalChange = bedChanges.reduce((a, b) => a + b, 0);

    return { avgElevation, avgChange, totalChange };
  }, [section, result]);

  const chainage = section.chainage * 0.1;
  const centerX = 0;
  const markerZ = Math.max(
    ...section.coordinates.map(c => c[2] * 0.5),
    (result?.sectionElevations[section.id]?.reduce((a, b) => Math.max(a, b), 0) || 0) * 0.5
  ) + 3;

  const changeColor = totalChange > 0.01 ? COLORS.erosion : totalChange < -0.01 ? COLORS.deposition : COLORS.neutral;

  return (
    <group position={[chainage, centerX, markerZ]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, 0, -0.5]}>
        <cylinderGeometry args={[isSelected ? 0.4 : 0.3, isSelected ? 0.5 : 0.4, 0.2, 16]} />
        <meshStandardMaterial
          color={isSelected ? COLORS.primary : '#64748B'}
          emissive={isSelected ? COLORS.primary : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
        <meshStandardMaterial color={isSelected ? COLORS.primary : '#64748B'} />
      </mesh>

      <Html
        position={[0, 0, 0.5]}
        center
        distanceFactor={15}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`
            px-3 py-2 rounded-lg text-xs whitespace-nowrap
            ${isSelected ? 'bg-sky-500/90' : 'bg-slate-800/90'}
            border-2 ${isSelected ? 'border-sky-400' : 'border-slate-600'}
            text-white shadow-lg
            transition-all duration-200
            ${isSelected ? 'scale-110' : 'scale-100'}
          `}
          style={{ pointerEvents: 'none' }}
        >
          <div className="font-bold text-sm mb-1">{section.name}</div>
          <div className="text-slate-200">桩号: {section.chainage}m</div>
          <div className="text-slate-200">高程: {formatElevation(avgElevation)}</div>
          <div style={{ color: changeColor }} className="font-medium mt-1">
            {totalChange > 0.01 ? `冲刷 +${totalChange.toFixed(3)}m` :
             totalChange < -0.01 ? `淤积 ${totalChange.toFixed(3)}m` :
             '稳定'}
          </div>
          {section.notes && isSelected && (
            <div className="text-amber-300 text-[10px] mt-1 max-w-[180px] break-words">
              备注: {section.notes}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
