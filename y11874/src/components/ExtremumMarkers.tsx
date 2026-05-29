import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSurfaceStore } from '@/store/useSurfaceStore';

const TYPE_COLORS: Record<string, string> = {
  maximum: '#ff3355',
  minimum: '#3388ff',
  saddle: '#f5a623',
};

const TYPE_LABELS: Record<string, string> = {
  maximum: '极大',
  minimum: '极小',
  saddle: '鞍点',
};

function ExtremumDot({ x, y, z, type }: { x: number; y: number; z: number; type: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = TYPE_COLORS[type] || '#ffffff';

  useFrame(() => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.15);
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <pointLight color={color} intensity={1.0} distance={3} />
      <Billboard follow position={[0, 0.4, 0]}>
        <Text fontSize={0.25} color={color} anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#000000">
          {TYPE_LABELS[type] || type}
        </Text>
      </Billboard>
    </group>
  );
}

export default function ExtremumMarkers() {
  const extrema = useSurfaceStore((s) => s.extrema);

  return (
    <group>
      {extrema.map((pt, i) => (
        <ExtremumDot key={`${pt.type}-${pt.x}-${pt.y}-${i}`} x={pt.x} y={pt.z} z={pt.y} type={pt.type} />
      ))}
    </group>
  );
}
