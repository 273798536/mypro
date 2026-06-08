import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Corridor } from "@/types";
import * as THREE from "three";

interface CorridorPathProps {
  corridor: Corridor;
}

export function CorridorPath({ corridor }: CorridorPathProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const flowRef = useRef<THREE.Mesh>(null);

  const { length, midX, midY, angle } = useMemo(() => {
    const dx = corridor.endPoint.x - corridor.startPoint.x;
    const dy = corridor.endPoint.y - corridor.startPoint.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      length: len,
      midX: (corridor.startPoint.x + corridor.endPoint.x) / 2,
      midY: (corridor.startPoint.y + corridor.endPoint.y) / 2,
      angle: Math.atan2(dy, dx),
    };
  }, [corridor]);

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const x = (t - 0.5) * length;
      const y = corridor.height / 2 + Math.random() * corridor.height / 2;
      const z = (Math.random() - 0.5) * corridor.width * 0.8;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, [length, corridor.width, corridor.height]);

  useFrame((state) => {
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 30; i++) {
        pos[i * 3] += 0.08;
        if (pos[i * 3] > length / 2) {
          pos[i * 3] = -length / 2;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (flowRef.current) {
      const mat = flowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
    }
  });

  return (
    <group position={[midX, 0, midY]} rotation={[0, -angle, 0]}>
      <mesh
        ref={flowRef}
        position={[0, corridor.height / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[length, corridor.width]} />
        <meshBasicMaterial
          color="#2DD4BF"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, corridor.height / 2, 0]}>
        <boxGeometry args={[length, corridor.height, corridor.width]} />
        <meshBasicMaterial
          color="#2DD4BF"
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.05, -corridor.width / 2]}>
        <boxGeometry args={[length, 0.1, 0.2]} />
        <meshBasicMaterial color="#2DD4BF" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.05, corridor.width / 2]}>
        <boxGeometry args={[length, 0.1, 0.2]} />
        <meshBasicMaterial color="#2DD4BF" transparent opacity={0.6} />
      </mesh>

      <mesh position={[-length / 2, 0.05, 0]}>
        <boxGeometry args={[0.2, 0.1, corridor.width]} />
        <meshBasicMaterial color="#2DD4BF" transparent opacity={0.6} />
      </mesh>
      <mesh position={[length / 2, 0.05, 0]}>
        <boxGeometry args={[0.2, 0.1, corridor.width]} />
        <meshBasicMaterial color="#2DD4BF" transparent opacity={0.6} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#5EEAD4"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
