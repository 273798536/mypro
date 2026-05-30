import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { TubeGeometry, CatmullRomCurve3, Vector3, Mesh, MeshBasicMaterial } from 'three';
import { WindCorridor } from '@/types';

interface CorridorPathProps {
  corridor: WindCorridor;
  isActive: boolean;
}

export default function CorridorPath({ corridor, isActive }: CorridorPathProps) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  const curve = useMemo(() => {
    const points = corridor.path.map(p => new Vector3(p[0], p[1], p[2]));
    return new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [corridor.path]);

  const tubeGeometry = useMemo(() => {
    return new TubeGeometry(curve, 128, corridor.width / 2, 16, false);
  }, [curve, corridor.width]);

  const glowGeometry = useMemo(() => {
    return new TubeGeometry(curve, 128, corridor.width / 2 + 1, 16, false);
  }, [curve, corridor.width]);

  useFrame((state) => {
    if (!isActive) return;

    const time = state.clock.elapsedTime;
    const breathe = 0.8 + Math.sin(time * 1.5) * 0.2;

    if (glowRef.current) {
      (glowRef.current.material as MeshBasicMaterial).opacity = 0.15 * breathe;
    }

    if (meshRef.current) {
      (meshRef.current.material as MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 2) * 0.1;
    }
  });

  if (!isActive) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={tubeGeometry}>
        <meshBasicMaterial
          color={corridor.color}
          transparent
          opacity={0.4}
          side={2}
        />
      </mesh>

      <mesh ref={glowRef} geometry={glowGeometry}>
        <meshBasicMaterial
          color={corridor.color}
          transparent
          opacity={0.15}
          side={2}
        />
      </mesh>

      {corridor.path.map((point, index) => (
        <mesh key={index} position={[point[0], point[1] + 1, point[2]]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color={corridor.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}
