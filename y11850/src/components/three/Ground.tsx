import { useRef, useMemo } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

export function Ground() {
  const gridRef = useRef<Mesh>(null);
  const planeRef = useRef<Mesh>(null);

  const gridSize = 200;
  const gridDivisions = 40;

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.x = -Math.PI / 2;
    }
  });

  const groundMaterial = useMemo(() => ({
    color: '#0F172A',
    transparent: true,
    opacity: 0.9,
  }), []);

  const gridMaterial = useMemo(() => ({
    color: '#334155',
    transparent: true,
    opacity: 0.3,
  }), []);

  return (
    <group>
      <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial {...groundMaterial} />
      </mesh>

      <gridHelper
        args={[gridSize, gridDivisions, '#475569', '#1E293B']}
        position={[0, 0.01, 0]}
      />

      <axesHelper args={[20]} position={[-gridSize / 2 + 5, 0.02, -gridSize / 2 + 5]} />
    </group>
  );
}
