import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/useGameStore';
import { normalize } from '@/utils/sectionMath';

export default function SectionPlane() {
  const params = useGameStore((s) => s.currentParams);
  const groupRef = useRef<THREE.Group>(null);

  const { position, quaternion, scale } = useMemo(() => {
    const n = normalize({
      x: params.normalX,
      y: params.normalY,
      z: params.normalZ,
    });
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(n.x, n.y, n.z);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const pos = new THREE.Vector3(params.positionX, params.positionY, params.positionZ);
    const scl = new THREE.Vector3(5, params.thickness, 5);
    return { position: pos, quaternion: quat, scale: scl };
  }, [params]);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      const mat = groupRef.current.children[0] as THREE.Mesh;
      if (mat?.material) {
        const m = mat.material as THREE.MeshBasicMaterial;
        m.opacity = 0.12 + Math.sin(t * 2) * 0.03;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} quaternion={quaternion} scale={scale}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial color="#00e5ff" transparent opacity={0.8} />
      </lineSegments>

      <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial color="#00e5ff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
