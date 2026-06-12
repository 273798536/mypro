import * as THREE from 'three';

interface ClippingPlaneVisualProps {
  height: number;
}

export default function ClippingPlaneVisual({ height }: ClippingPlaneVisualProps) {
  return (
    <group position={[0, -height, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <gridHelper args={[120, 24, '#00E5FF', '#0088aa']}>
        <lineBasicMaterial attach="material" color="#00E5FF" transparent opacity={0.15} />
      </gridHelper>
    </group>
  );
}
