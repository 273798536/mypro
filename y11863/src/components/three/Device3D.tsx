import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Device, DeviceMeter, EnergyType } from '../../types';
import { getHeatmapColorThree } from '../../utils/heatmapColors';
import { AlertTriangle } from 'lucide-react';

interface Device3DProps {
  device: Device;
  deviceMeter?: DeviceMeter;
  floorPosition: [number, number, number];
  energyType: EnergyType;
  energyRange: { min: number; max: number };
  isSelected: boolean;
  onSelect: (deviceId: string) => void;
}

const deviceColors: Record<string, string> = {
  hvac: '#3b82f6',
  lighting: '#fbbf24',
  elevator: '#8b5cf6',
  other: '#64748b',
};

export const Device3D = ({
  device,
  deviceMeter,
  floorPosition,
  energyType,
  energyRange,
  isSelected,
  onSelect,
}: Device3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position: [number, number, number] = [
    floorPosition[0] + device.position[0],
    floorPosition[1] + device.position[1],
    floorPosition[2] + device.position[2],
  ];

  const energyValue = deviceMeter?.energyConsumption[energyType] || 0;
  const heatColor = getHeatmapColorThree(energyValue, energyRange.min, energyRange.max);
  const baseColor = deviceMeter ? heatColor : deviceColors[device.type];
  const isAbnormal = deviceMeter?.isAbnormal || false;

  useFrame((state) => {
    if (meshRef.current && isAbnormal) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(device.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={device.dimensions} />
        <meshStandardMaterial
          color={baseColor}
          emissive={isSelected || hovered ? baseColor : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>

      {isAbnormal && (
        <Html position={[0, device.dimensions[1] / 2 + 0.5, 0]} center>
          <div className="relative">
            <div className="absolute -inset-2 bg-red-500 rounded-full animate-ping opacity-30" />
            <div className="relative bg-red-500 text-white rounded-full p-1 shadow-lg shadow-red-500/50">
              <AlertTriangle size={14} />
            </div>
          </div>
        </Html>
      )}

      {(hovered || isSelected) && (
        <Html position={[0, device.dimensions[1] / 2 + 1, 0]} center>
          <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
            <div className="font-semibold text-sm">{device.name}</div>
            {deviceMeter && (
              <div className="text-xs text-slate-300 mt-1">
                能耗: {energyValue.toLocaleString()} kWh
              </div>
            )}
            {isAbnormal && deviceMeter?.abnormalReason && (
              <div className="text-xs text-red-400 mt-1 max-w-48">
                ⚠️ {deviceMeter.abnormalReason}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
