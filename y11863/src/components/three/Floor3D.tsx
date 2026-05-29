import { useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, FloorMeter, EnergyType } from '../../types';
import { Device3D } from './Device3D';
import { getHeatmapColorThree } from '../../utils/heatmapColors';

interface Floor3DProps {
  floor: Floor;
  floorMeter?: FloorMeter;
  energyType: EnergyType;
  floorEnergyRange: { min: number; max: number };
  isSelected: boolean;
  selectedDevice: string | null;
  onSelect: (floorId: string) => void;
  onSelectDevice: (deviceId: string) => void;
}

export const Floor3D = ({
  floor,
  floorMeter,
  energyType,
  floorEnergyRange,
  isSelected,
  selectedDevice,
  onSelect,
  onSelectDevice,
}: Floor3DProps) => {
  const [hovered, setHovered] = useState(false);

  const energyValue = floorMeter?.energyConsumption[energyType] || 0;
  const heatColor = getHeatmapColorThree(energyValue, floorEnergyRange.min, floorEnergyRange.max);

  const abnormalDevices = floorMeter?.devices.filter((d) => d.isAbnormal) || [];

  const deviceEnergyValues = floorMeter?.devices.map((d) => d.energyConsumption[energyType] || 0) || [];
  const deviceEnergyRange = {
    min: Math.min(...deviceEnergyValues, 0),
    max: Math.max(...deviceEnergyValues, 100),
  };

  return (
    <group position={floor.position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(floor.id);
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
        <boxGeometry args={floor.dimensions} />
        <meshStandardMaterial
          color={heatColor}
          emissive={isSelected || hovered ? heatColor : '#1e293b'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
          transparent
          opacity={0.7}
        />
      </mesh>

      <mesh position={[0, floor.dimensions[1] / 2 + 0.01, 0]}>
        <planeGeometry args={[floor.dimensions[0] - 0.5, floor.dimensions[2] - 0.5]} />
        <meshStandardMaterial
          color={heatColor}
          transparent
          opacity={0.9}
          side={2}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...floor.dimensions)]} />
        <lineBasicMaterial color="#475569" linewidth={1} />
      </lineSegments>

      <Html position={[0, floor.dimensions[1] / 2 + 0.3, floor.dimensions[2] / 2 + 0.5]} center>
        <div
          className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
            isSelected
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : hovered
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800/80 text-slate-300'
          }`}
        >
          {floor.name}
        </div>
      </Html>

      {floor.devices.map((device) => (
        <Device3D
          key={device.id}
          device={device}
          deviceMeter={floorMeter?.devices.find((d) => d.deviceId === device.id)}
          floorPosition={[0, 0, 0]}
          energyType={energyType}
          energyRange={deviceEnergyRange}
          isSelected={selectedDevice === device.id}
          onSelect={onSelectDevice}
        />
      ))}

      {abnormalDevices.length > 0 && (
        <Html position={[floor.dimensions[0] / 2 + 0.5, floor.dimensions[1] / 2, 0]} center>
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
            {abnormalDevices.length} 异常
          </div>
        </Html>
      )}
    </group>
  );
};
