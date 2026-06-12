import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/store/sceneStore';

export default function ClippingPlane() {
  const clippingEnabled = useSceneStore((s) => s.clippingEnabled);
  const clippingHeight = useSceneStore((s) => s.clippingHeight);

  const clipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), clippingHeight), []);

  useMemo(() => {
    clipPlane.constant = clippingHeight;
  }, [clippingHeight, clipPlane]);

  if (!clippingEnabled) return null;

  return (
    <mesh position={[0, -clippingHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="#00E5FF" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
