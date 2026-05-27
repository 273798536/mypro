import { useRef, useMemo } from 'react';
import { Mesh, BufferGeometry, Vector3 } from 'three';
import { Line } from '@react-three/drei';
import { BallState } from '../../types';
import { VectorArrow } from './VectorArrow';

interface Ball3DProps {
  ball: BallState;
  showVelocity?: boolean;
  showTrail?: boolean;
}

export function Ball3D({ ball, showVelocity = true, showTrail = true }: Ball3DProps) {
  const meshRef = useRef<Mesh>(null);

  const trailGeometry = useMemo(() => {
    if (ball.trail.length < 2) return null;
    return ball.trail.map((p) => [p.x, ball.radius, p.z] as [number, number, number]);
  }, [ball.trail, ball.radius]);

  const velocityScale = 0.5;

  return (
    <group>
      <mesh ref={meshRef} position={[ball.position.x, ball.radius, ball.position.z]} castShadow>
        <sphereGeometry args={[ball.radius, 32, 32]} />
        <meshStandardMaterial
          color={ball.color}
          roughness={0.2}
          metalness={0.8}
          emissive={ball.color}
          emissiveIntensity={0.1}
        />
      </mesh>

      <mesh position={[ball.position.x, ball.radius + 0.01, ball.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ball.radius * 1.2, ball.radius * 1.4, 32]} />
        <meshBasicMaterial color={ball.color} transparent opacity={0.5} side={2} />
      </mesh>

      {showVelocity && (
        <VectorArrow
          position={new Vector3(ball.position.x, ball.radius, ball.position.z)}
          direction={ball.velocity}
          color={ball.color}
          scale={velocityScale}
        />
      )}

      {showTrail && trailGeometry && (
        <Line
          points={trailGeometry}
          color={ball.color}
          transparent
          opacity={0.6}
          lineWidth={2}
        />
      )}
    </group>
  );
}
