import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { LineSegments, LineBasicMaterial, Vector3, BufferGeometry } from 'three';
import { useAppStore } from '@/store/useAppStore';
import { sunPositionTo3D } from '@/utils/sunCalculator';

const SEASON_COLORS: Record<string, string> = {
  spring: '#22C55E',
  summer: '#F97316',
  autumn: '#EAB308',
  winter: '#3B82F6',
};

export function SunPathLine() {
  const { dataPackage, currentSeason, showSunPath, currentTime } = useAppStore();
  const lineRefs = useRef<Record<string, LineSegments>>( {});

  const paths = useMemo(() => {
    if (!dataPackage || !showSunPath) return {};

    const result: Record<string, Vector3[]> = {};
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;

    for (const season of seasons) {
      const positions = dataPackage.sunPath[season];
      const points: Vector3[] = [];
      
      for (const pos of positions) {
        if (pos.altitude > 0) {
          const [x, y, z] = sunPositionTo3D(pos, 120);
          points.push(new Vector3(x, y, z));
        }
      }
      
      result[season] = points;
    }

    return result;
  }, [dataPackage, showSunPath]);

  const currentDotPosition = useMemo(() => {
    if (!dataPackage || !showSunPath) return null;
    
    const currentPositions = dataPackage.sunPath[currentSeason];
    const currentPos = currentPositions.find(p => Math.abs(p.hour - currentTime) < 0.25);
    
    if (currentPos && currentPos.altitude > 0) {
      const [x, y, z] = sunPositionTo3D(currentPos, 120);
      return new Vector3(x, y, z);
    }
    
    return null;
  }, [dataPackage, currentSeason, currentTime, showSunPath]);

  useFrame(() => {
    Object.entries(lineRefs.current).forEach(([season, line]) => {
      if (line && line.material) {
        const mat = Array.isArray(line.material) ? line.material[0] : line.material;
        if (mat instanceof LineBasicMaterial) {
          const isCurrent = season === currentSeason;
          mat.opacity = isCurrent ? 0.9 : 0.25;
          mat.transparent = true;
        }
      }
    });
  });

  if (!showSunPath || Object.keys(paths).length === 0) return null;

  return (
    <group>
      {Object.entries(paths).map(([season, points]) => {
        if (points.length < 2) return null;
        
        const geometry = new BufferGeometry().setFromPoints(points);
        const color = SEASON_COLORS[season];
        const isCurrent = season === currentSeason;
        
        return (
          <lineSegments
            key={season}
            ref={(el) => { if (el) lineRefs.current[season] = el; }}
            geometry={geometry}
          >
            <lineBasicMaterial
              color={color}
              linewidth={isCurrent ? 3 : 1}
              transparent
              opacity={isCurrent ? 0.9 : 0.25}
            />
          </lineSegments>
        );
      })}

      {currentDotPosition && (
        <mesh position={currentDotPosition}>
          <sphereGeometry args={[3, 16, 16]} />
          <meshBasicMaterial color={SEASON_COLORS[currentSeason]} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
