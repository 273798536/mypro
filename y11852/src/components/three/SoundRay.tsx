import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { useDataStore } from '@/store/useDataStore';
import { useRayAnimation } from '@/hooks/useRayAnimation';
import { getFrequencyColor } from '@/engine/acoustics';
import { vec3ToThree } from '@/engine/geometry';
import type { SoundRay as SoundRayType } from '@/types/acoustics';

interface RayLineProps {
  ray: SoundRayType;
  visiblePoints: THREE.Vector3[];
  opacity: number;
  isActive: boolean;
}

const RayLine = ({ ray, visiblePoints, opacity, isActive }: RayLineProps) => {
  const color = getFrequencyColor(ray.frequency as 'low' | 'mid' | 'high');

  if (visiblePoints.length < 2) return null;

  return (
    <group>
      <Line
        points={visiblePoints}
        color={color}
        transparent
        opacity={opacity * 0.9}
        lineWidth={2}
      />

      {isActive && (
        <Line
          points={visiblePoints}
          color={color}
          transparent
          opacity={opacity * 0.4}
          lineWidth={6}
        />
      )}

      {visiblePoints.length > 0 && (
        <mesh position={visiblePoints[visiblePoints.length - 1]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )}

      {isActive && visiblePoints.length > 0 && (
        <pointLight
          position={visiblePoints[visiblePoints.length - 1]}
          color={color}
          intensity={opacity * 2}
          distance={3}
        />
      )}
    </group>
  );
};

export const SoundRay = () => {
  const { showRays, rayOpacity } = useSceneStore();
  const { soundRays } = useDataStore();
  const { getVisibleRays, getRayPathForCurrentTime, getRayOpacity, isRayActive } = useRayAnimation();

  if (!showRays || soundRays.length === 0) return null;

  const visibleRays = getVisibleRays();

  return (
    <group>
      {visibleRays.map((ray) => {
        const currentPath = getRayPathForCurrentTime(ray);
        const threePoints = currentPath.map((p) => vec3ToThree(p));
        const opacity = getRayOpacity(ray) * rayOpacity;
        const active = isRayActive(ray);

        if (opacity < 0.05 || threePoints.length < 2) return null;

        return (
          <RayLine
            key={ray.id}
            ray={ray}
            visiblePoints={threePoints}
            opacity={opacity}
            isActive={active}
          />
        );
      })}
    </group>
  );
};
