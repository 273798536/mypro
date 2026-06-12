import { useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/store/sceneStore';

interface TrajectoryLineProps {
  points: { x: number; y: number; depth: number }[];
  color: string;
  opacity?: number;
  clipPlanes?: THREE.Plane[];
}

export default function TrajectoryLine({ points, color, opacity = 1, clipPlanes = [] }: TrajectoryLineProps) {
  const progress = useSceneStore((s) => s.timelineProgress);

  const curve = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(p.x, -p.depth, p.y));
    if (pts.length < 2) return new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3()]);
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }, [points]);

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, points.length * 3, 0.18, 10, false);
  }, [curve, points.length]);

  const visibleEnd = Math.floor(tubeGeometry.attributes.position.count * progress);

  return (
    <mesh geometry={tubeGeometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        clippingPlanes={clipPlanes}
        clipShadows
      />
      {progress < 1 && (
        <meshBasicMaterial
          attach="material"
          color={color}
          transparent
          opacity={opacity * 0.25}
          clippingPlanes={clipPlanes}
        />
      )}
    </mesh>
  );
}
