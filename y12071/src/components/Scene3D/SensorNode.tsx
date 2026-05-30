import { useState } from 'react';
import { Box, Html } from '@react-three/drei';
import { Sensor as SensorType } from '../../types';
import { useStore } from '../../store/useStore';

interface SensorNodeProps {
  sensor: SensorType;
  showLabel?: boolean;
}

const sensorColors: Record<string, string> = {
  online: '#43A047',
  offline: '#E53935',
  warning: '#FB8C00',
};

const sensorTypeNames: Record<string, string> = {
  stress: '应力',
  displacement: '位移',
  gas: '瓦斯',
};

export function SensorNode({ sensor, showLabel }: SensorNodeProps) {
  const [hovered, setHovered] = useState(false);
  const setSelectedDetectionId = useStore(state => state.setSelectedDetectionId);

  const color = sensorColors[sensor.status] || '#666';
  const pulseScale = sensor.status === 'offline' ? 1.1 : 1;

  const handleClick = () => {
    if (sensor.status !== 'online') {
      const detectionId = sensor.status === 'offline' 
        ? `offline-${sensor.id}` 
        : `warning-${sensor.id}`;
      setSelectedDetectionId(detectionId);
    }
  };

  return (
    <group position={sensor.position}>
      <group
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <Box args={[0.3, 0.3, 0.15]} scale={hovered ? 1.2 : pulseScale}>
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={hovered ? 0.6 : 0.3} 
          />
        </Box>

        {sensor.status === 'offline' && (
          <mesh position={[0, 0.5, 0]}>
            <ringGeometry args={[0.15, 0.2, 16]} />
            <meshBasicMaterial color={color} side={2} transparent opacity={0.8} />
          </mesh>
        )}
      </group>

      {(showLabel || hovered) && (
        <Html position={[0, 0.6, 0]} center distanceFactor={10}>
          <div className={`text-xs px-2 py-1 rounded whitespace-nowrap border ${
            sensor.status === 'offline'
              ? 'bg-red-900 bg-opacity-90 border-red-500 text-red-200'
              : sensor.status === 'warning'
              ? 'bg-orange-900 bg-opacity-90 border-orange-500 text-orange-200'
              : 'bg-green-900 bg-opacity-90 border-green-500 text-green-200'
          }`}>
            {sensor.name}
            <br />
            <span className="opacity-80">
              {sensorTypeNames[sensor.type]}: {sensor.status === 'offline' ? '离线' : sensor.value}
            </span>
            <br />
            <span className="opacity-60">
              坐标: ({sensor.position.map(v => v.toFixed(1)).join(', ')})
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
