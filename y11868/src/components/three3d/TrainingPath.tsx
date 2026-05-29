import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../../store/useSceneStore';

interface TrainingPathProps {
  path: [number, number, number][];
}

export function TrainingPath({ path }: TrainingPathProps) {
  const lineRef = useRef<any>(null);
  const pointRef = useRef<THREE.Mesh>(null);
  const { currentStep, isPlaying } = useSceneStore();
  
  const { geometry, maxLength } = useMemo(() => {
    const points = path.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(points);
    const curvePoints = curve.getPoints(500);
    const geo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    
    return { geometry: geo, maxLength: curvePoints.length };
  }, [path]);

  useFrame((_, delta) => {
    if (isPlaying && pointRef.current) {
      const progress = Math.min(currentStep / Math.max(path.length - 1, 1), 1);
      const idx = Math.floor(progress * maxLength);
      
      const positions = geometry.attributes.position;
      if (idx < positions.count) {
        pointRef.current.position.set(
          positions.getX(idx),
          positions.getY(idx),
          positions.getZ(idx)
        );
      }
    }
  });

  const currentProgress = Math.min(currentStep / Math.max(path.length - 1, 1), 1);

  return (
    <group>
      <primitive object={new THREE.Line(geometry)} ref={lineRef}>
        <lineBasicMaterial color="#00D4FF" linewidth={2} opacity={0.8} transparent />
      </primitive>
      
      <mesh ref={pointRef} position={path[0] || [0, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#00FF88" />
      </mesh>
      
      <mesh position={path[path.length - 1] || [0, 0, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#FF6B6B" />
      </mesh>
    </group>
  );
}
