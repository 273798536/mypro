import { useState, useMemo } from 'react';
import { TubeGeometry, CatmullRomCurve3, Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { useSandboxStore } from '../../store/useSandboxStore';
import { Taxiway } from '../../types';

interface Taxiway3DProps {
  taxiway: Taxiway;
  isHighlighted: boolean;
  hasConflict: boolean;
}

export function Taxiway3D({ taxiway, isHighlighted, hasConflict }: Taxiway3DProps) {
  const [hovered, setHovered] = useState(false);
  const focusOnTaxiway = useSandboxStore((state) => state.focusOnTaxiway);

  const { geometry, midPoint } = useMemo(() => {
    const points = taxiway.points.map(p => new Vector3(...p));
    const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0);
    const tubeGeometry = new TubeGeometry(curve, 64, taxiway.width / 2, 8, false);
    const mid = curve.getPoint(0.5);
    return { geometry: tubeGeometry, midPoint: mid };
  }, [taxiway.points, taxiway.width]);

  let baseColor = '#3a4a5a';
  if (hasConflict) baseColor = '#ffd32a';

  const displayColor = hovered || isHighlighted ? '#ff6b35' : baseColor;

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => focusOnTaxiway(taxiway.id)}
        receiveShadow
      >
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isHighlighted || hasConflict ? 0.3 : 0.05}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      <mesh geometry={geometry} position={[0, 0.02, 0]}>
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={isHighlighted || hasConflict ? 0.15 : 0.05}
        />
      </mesh>

      {(hovered || isHighlighted) && (
        <Html
          position={[midPoint.x, 1, midPoint.z]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="bg-slate-900/90 text-white px-3 py-2 rounded-lg text-sm font-mono whitespace-nowrap border border-slate-600 shadow-lg">
            <div className="font-bold text-amber-400">{taxiway.name}</div>
            <div className="text-xs text-gray-400 mt-1">
              {taxiway.direction === 'two-way' ? '双向' : '单向'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
