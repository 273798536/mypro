import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { vesselPaths } from '../../data/mockData';

export default function VesselPath() {
  const showVessels = useStore((s) => s.showVessels);
  const currentTimestampIndex = useStore((s) => s.currentTimestampIndex);
  const scale = 0.01;
  const vesselRefs = useRef<(THREE.Mesh | null)[]>([]);

  const pathLinePoints = useMemo(() => {
    return vesselPaths.map((vp) => {
      return vp.waypoints.map(([x, , z]) => [x * scale, 0.5, z * scale] as [number, number, number]);
    });
  }, [scale]);

  const vesselPositions = useMemo(() => {
    const t = currentTimestampIndex / 11;
    return vesselPaths.map((vp) => {
      const totalSegments = vp.waypoints.length - 1;
      const segFloat = t * totalSegments;
      const segIdx = Math.min(Math.floor(segFloat), totalSegments - 1);
      const segT = segFloat - segIdx;
      const p1 = vp.waypoints[segIdx];
      const p2 = vp.waypoints[Math.min(segIdx + 1, vp.waypoints.length - 1)];
      const x = (p1[0] + (p2[0] - p1[0]) * segT) * scale;
      const z = (p1[2] + (p2[2] - p1[2]) * segT) * scale;
      return { vesselId: vp.vesselId, x, y: 0.5, z };
    });
  }, [currentTimestampIndex, scale]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    vesselRefs.current.forEach((mesh) => {
      if (mesh) {
        mesh.position.y = 0.5 + Math.sin(time * 2) * 0.15;
      }
    });
  });

  if (!showVessels) return null;

  return (
    <group>
      {vesselPaths.map((vp, idx) => (
        <group key={vp.vesselId}>
          <Line
            points={pathLinePoints[idx]}
            color="#34D399"
            lineWidth={1.5}
            dashed
            dashSize={0.5}
            gapSize={0.3}
          />

          <mesh
            ref={(el) => { vesselRefs.current[idx] = el; }}
            position={[
              vesselPositions[idx]?.x ?? 0,
              vesselPositions[idx]?.y ?? 0.5,
              vesselPositions[idx]?.z ?? 0,
            ]}
          >
            <coneGeometry args={[0.5, 1.8, 6]} />
            <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
