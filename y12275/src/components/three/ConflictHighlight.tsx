import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Gate } from '../../types';

interface ConflictHighlightProps {
  gates: Gate[];
  type: 'gate_conflict' | 'taxi_crossing' | 'wait_timeout';
}

export function ConflictHighlight({ gates, type }: ConflictHighlightProps) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh[]>([]);

  const colorMap = {
    gate_conflict: '#ff4757',
    taxi_crossing: '#ffd32a',
    wait_timeout: '#ffa502',
  };

  const color = new THREE.Color(colorMap[type]);

  const centerPosition = useMemo(() => {
    if (gates.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = gates.reduce(
      (acc, gate) => acc.add(new THREE.Vector3(...gate.position)),
      new THREE.Vector3(0, 0, 0)
    );
    return sum.divideScalar(gates.length);
  }, [gates]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (pulseRef.current) {
      const scale = 1 + Math.sin(time * 3) * 0.2;
      pulseRef.current.scale.setScalar(scale);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(time * 3) * 0.2;
    }

    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        const offset = (i * Math.PI * 2) / ringsRef.current.length;
        const scale = 1.5 + ((time * 0.5 + offset) % 1) * 2;
        ring.scale.setScalar(scale);
        const material = ring.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.5 - ((time * 0.5 + offset) % 1) * 0.5);
      }
    });
  });

  const maxDistance = useMemo(() => {
    if (gates.length <= 1) return 8;
    let maxDist = 0;
    for (let i = 0; i < gates.length; i++) {
      for (let j = i + 1; j < gates.length; j++) {
        const dist = new THREE.Vector3(...gates[i].position).distanceTo(
          new THREE.Vector3(...gates[j].position)
        );
        maxDist = Math.max(maxDist, dist);
      }
    }
    return Math.max(maxDist + 4, 8);
  }, [gates]);

  return (
    <group position={[centerPosition.x, 0.1, centerPosition.z]}>
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[maxDistance, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>

      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ringsRef.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[maxDistance - 0.5, maxDistance, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            side={2}
          />
        </mesh>
      ))}

      <pointLight
        position={[0, 5, 0]}
        color={color}
        intensity={2}
        distance={maxDistance * 2}
      />
    </group>
  );
}
