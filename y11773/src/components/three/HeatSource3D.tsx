import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { toKelvin, intensityToColor } from '../../utils/physics';
import { useAppStore } from '../../store/useAppStore';
import { Draggable } from './Draggable';

interface HeatSource3DProps {
  position: [number, number, number];
  temperature: number;
  temperatureUnit: 'celsius' | 'kelvin' | 'fahrenheit';
  area: number;
  emissivity: number;
  onPositionChange: (position: [number, number, number]) => void;
}

export function HeatSource3D({
  position,
  temperature,
  temperatureUnit,
  area,
  emissivity,
  onPositionChange,
}: HeatSource3DProps) {
  const meshRef = useRef<Mesh>(null);
  const maxFieldIntensity = useAppStore((state) => state.maxFieldIntensity);

  const tempKelvin = toKelvin(temperature, temperatureUnit);
  const { exitance } = useMemo(() => {
    const STEFAN_BOLTZMANN = 5.670374419e-8;
    const exitance = emissivity * STEFAN_BOLTZMANN * Math.pow(tempKelvin, 4);
    return { exitance };
  }, [tempKelvin, emissivity]);

  const [r, g, b] = intensityToColor(exitance, maxFieldIntensity);
  const color = `rgb(${r}, ${g}, ${b})`;
  const emissiveColor = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 30)}, ${Math.max(0, b - 20)})`;

  const radius = useMemo(() => {
    return Math.max(0.3, Math.sqrt(area / Math.PI) * 0.5);
  }, [area]);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = 1 + Math.sin(time * 2) * 0.02;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Draggable position={position} onPositionChange={onPositionChange}>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={Math.min(5, tempKelvin / 300)}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <pointLight
        position={position}
        color={emissiveColor}
        intensity={Math.min(100, tempKelvin / 50)}
        distance={20}
        decay={2}
      />
    </Draggable>
  );
}
