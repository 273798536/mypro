import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { toKelvin, intensityToColor, calculateRadiationIntensity } from '../../utils/physics';
import { useAppStore } from '../../store/useAppStore';

interface RadiationFieldProps {
  heatSourcePosition: [number, number, number];
  temperature: number;
  temperatureUnit: 'celsius' | 'kelvin' | 'fahrenheit';
  area: number;
  emissivity: number;
}

export function RadiationField({
  heatSourcePosition,
  temperature,
  temperatureUnit,
  area,
  emissivity,
}: RadiationFieldProps) {
  const groupRef = useRef<Group>(null);
  const maxFieldIntensity = useAppStore((state) => state.maxFieldIntensity);

  const tempKelvin = toKelvin(temperature, temperatureUnit);

  const shells = useMemo(() => {
    const distances = [0.5, 1, 2, 4, 8];
    return distances.map((distance) => {
      const { intensity } = calculateRadiationIntensity(
        tempKelvin,
        emissivity,
        area,
        distance,
      );
      const [r, g, b] = intensityToColor(intensity, maxFieldIntensity);
      const opacity = Math.max(0.02, Math.min(0.3, intensity / maxFieldIntensity));
      return { distance, intensity, color: `rgb(${r}, ${g}, ${b})`, opacity };
    });
  }, [tempKelvin, emissivity, area, maxFieldIntensity]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.y = time * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={heatSourcePosition}>
      {shells.map((shell, index) => (
        <mesh key={index} position={[0, 0, 0]}>
          <sphereGeometry args={[shell.distance, 48, 48]} />
          <meshBasicMaterial
            color={shell.color}
            transparent
            opacity={shell.opacity}
            side={2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
