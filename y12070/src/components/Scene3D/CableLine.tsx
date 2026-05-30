import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { CableRoute } from '../../data/types';
import { useStore } from '../../store/useStore';
import type { CableCrossing } from '../../data/types';

interface CableLineProps {
  cable: CableRoute;
  crossings: CableCrossing[];
}

export default function CableLine({ cable, crossings }: CableLineProps) {
  const showCables = useStore((s) => s.showCables);
  const scale = 0.01;
  const depth = -3;

  const curve = useMemo(() => {
    const points = cable.waypoints.map(
      ([x, y]) => new THREE.Vector3(x * scale, depth, y * scale)
    );
    return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  }, [cable.waypoints, scale, depth]);

  const tubeGeo = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.3, 8, false);
  }, [curve]);

  const cableCrossings = useMemo(
    () => crossings.filter((c) => c.cable1Id === cable.id || c.cable2Id === cable.id),
    [crossings, cable.id]
  );

  if (!showCables) return null;

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={cable.color}
          emissive={cable.color}
          emissiveIntensity={0.15}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {cable.waypoints.map((wp, i) => (
        <group key={i} position={[wp[0] * scale, depth + 0.5, wp[1] * scale]}>
          <mesh>
            <sphereGeometry args={[0.4, 12, 8]} />
            <meshStandardMaterial color={cable.color} emissive={cable.color} emissiveIntensity={0.4} />
          </mesh>
          <Html center distanceFactor={80}>
            <div
              style={{
                background: 'rgba(10,22,40,0.9)',
                border: `1px solid ${cable.color}`,
                borderRadius: 3,
                padding: '1px 4px',
                color: cable.color,
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {cable.voltage}
            </div>
          </Html>
        </group>
      ))}

      {cableCrossings.map((c, i) => (
        <group key={`cross-${i}`} position={[c.point[0] * scale, depth + 1, c.point[1] * scale]}>
          <mesh>
            <sphereGeometry args={[0.8, 16, 12]} />
            <meshStandardMaterial
              color="#EF4444"
              emissive="#EF4444"
              emissiveIntensity={0.6}
              transparent
              opacity={0.8}
            />
          </mesh>
          <pointLight color="#EF4444" intensity={1} distance={15} />
          <Html center distanceFactor={60}>
            <div
              style={{
                background: 'rgba(239,68,68,0.9)',
                borderRadius: 3,
                padding: '2px 6px',
                color: '#FFF',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              穿越 {c.cable1Id}×{c.cable2Id}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
