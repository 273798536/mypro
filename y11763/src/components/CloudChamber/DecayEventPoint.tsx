import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { DecayEvent } from '../../types/particle';

interface DecayEventPointProps {
  event: DecayEvent;
}

export default function DecayEventPoint({ event }: DecayEventPointProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(1);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 2;
      pulseRef.current += delta * 2;
      if (pulseRef.current > 2) pulseRef.current = 0.5;

      const scale = pulseRef.current;
      groupRef.current.scale.setScalar(scale);

      const children = groupRef.current.children;
      if (children[0]) {
        const mat = (children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.8 / scale;
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[event.position.x, event.position.y, event.position.z]}
    >
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      {event.decayProducts.map((_, i) => {
        const angle = (i / event.decayProducts.length) * Math.PI * 2;
        const endPos: [number, number, number] = [
          Math.cos(angle) * 1.5,
          Math.sin(angle) * 0.75,
          Math.sin(angle) * 1.5,
        ];
        return (
          <Line
            key={`decay-line-${i}`}
            points={[[0, 0, 0], endPos]}
            color="#fbbf24"
            transparent
            opacity={0.6}
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}
