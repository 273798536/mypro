import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EscapeRoute as EscapeRouteType } from '@/types';

interface EscapeRouteProps {
  route: EscapeRouteType;
}

export function EscapeRoute({ route }: EscapeRouteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lineColor = route.isValid ? '#38a169' : '#e53e3e';

  const { mainLine, glowLine } = useMemo(() => {
    const points = route.points.map(
      (p) => new THREE.Vector3(p[0], p[1], p[2])
    );
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    const mainMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.8,
    });

    const glowMaterial = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0.3,
    });

    return {
      mainLine: new THREE.Line(lineGeometry, mainMaterial),
      glowLine: new THREE.Line(lineGeometry, glowMaterial),
    };
  }, [route.points, lineColor]);

  useFrame(({ clock }) => {
    if (mainLine.material instanceof THREE.LineBasicMaterial) {
      mainLine.material.opacity = 0.7 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
    if (glowLine.material instanceof THREE.LineBasicMaterial) {
      glowLine.material.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={mainLine} />
      <primitive object={glowLine} />

      {route.points.map((point, index) => {
        const isWallCrossing = route.wallCrossings.includes(index);
        const size = index === 0 || index === route.points.length - 1 ? 0.2 : 0.1;

        return (
          <mesh key={index} position={point}>
            <sphereGeometry args={[size, 8, 8]} />
            <meshStandardMaterial
              color={isWallCrossing ? '#e53e3e' : lineColor}
              emissive={isWallCrossing ? '#e53e3e' : lineColor}
              emissiveIntensity={isWallCrossing ? 0.8 : 0.4}
            />
          </mesh>
        );
      })}

      {!route.isValid && (
        <mesh position={route.points[Math.floor(route.points.length / 2)]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color="#e53e3e"
            emissive="#e53e3e"
            emissiveIntensity={0.8 + Math.sin(Date.now() * 0.005) * 0.3}
          />
        </mesh>
      )}
    </group>
  );
}
