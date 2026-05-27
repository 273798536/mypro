import { useRef } from 'react';
import { Mesh } from 'three';

interface TableProps {
  width: number;
  height: number;
}

export function Table({ width, height }: TableProps) {
  const tableRef = useRef<Mesh>(null);
  const borderThickness = 0.3;
  const borderHeight = 0.5;

  return (
    <group>
      <mesh
        ref={tableRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#1a472a"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, borderHeight / 2, height / 2 + borderThickness / 2]}>
        <boxGeometry args={[width + borderThickness * 2, borderHeight, borderThickness]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      <mesh position={[0, borderHeight / 2, -height / 2 - borderThickness / 2]}>
        <boxGeometry args={[width + borderThickness * 2, borderHeight, borderThickness]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      <mesh position={[width / 2 + borderThickness / 2, borderHeight / 2, 0]}>
        <boxGeometry args={[borderThickness, borderHeight, height + borderThickness * 2]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      <mesh position={[-width / 2 - borderThickness / 2, borderHeight / 2, 0]}>
        <boxGeometry args={[borderThickness, borderHeight, height + borderThickness * 2]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>

      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width + 2, height + 2]} />
        <meshBasicMaterial color="#0A1628" />
      </mesh>

      <gridHelper args={[width, 20, '#00D4FF30', '#00D4FF10']} position={[0, 0.01, 0]} />
    </group>
  );
}
