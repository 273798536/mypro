import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Sensor } from '../../types';

interface SensorMarkersProps {
  sensors: Sensor[];
}

export function SensorMarkers({ sensors }: SensorMarkersProps) {
  return (
    <group>
      {sensors.map((sensor) => (
        <SensorMarker key={sensor.id} sensor={sensor} />
      ))}
    </group>
  );
}

interface SensorMarkerProps {
  sensor: Sensor;
}

function SensorMarker({ sensor }: SensorMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const blinkRef = useRef(0);

  useFrame((state) => {
    if (groupRef.current && sensor.status !== 'online') {
      blinkRef.current += 0.1;
      const scale = 1 + Math.sin(blinkRef.current) * 0.15;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const getColor = () => {
    switch (sensor.status) {
      case 'online':
        return 0x48bb78;
      case 'warning':
        return 0xed8936;
      case 'offline':
        return 0xe53e3e;
      default:
        return 0x718096;
    }
  };

  const getStatusText = () => {
    switch (sensor.status) {
      case 'online':
        return '在线';
      case 'warning':
        return '警告';
      case 'offline':
        return '离线';
      default:
        return '未知';
    }
  };

  const getSensorIcon = () => {
    switch (sensor.type) {
      case 'pressure':
        return 'P';
      case 'water_level':
        return 'W';
      case 'flow':
        return 'F';
      default:
        return '?';
    }
  };

  return (
    <group
      ref={groupRef}
      position={[sensor.position.x, sensor.position.y, sensor.position.z]}
    >
      <mesh
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
        <cylinderGeometry args={[0.4, 0.4, 0.6, 16]} />
        <meshStandardMaterial color={getColor()} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.5, 0.15, 16]} />
        <meshStandardMaterial color={0x2d3748} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color={0x4a5568} />
      </mesh>
      {sensor.status !== 'online' && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color={getColor()} transparent opacity={0.8} />
        </mesh>
      )}
      {sensor.status === 'offline' && (
        <mesh position={[0, 0.8, 0]}>
          <torusGeometry args={[0.25, 0.03, 8, 32]} />
          <meshBasicMaterial color={0xff0000} transparent opacity={0.6} />
        </mesh>
      )}
      {(hovered || sensor.status !== 'online') && (
        <Html position={[1.2, 0.5, 0]} center distanceFactor={12}>
          <div className="bg-gray-900/95 backdrop-blur-sm px-3 py-2 rounded-lg text-white text-xs shadow-xl min-w-[140px]">
            <div className="font-bold text-sm mb-1">{sensor.name}</div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-400">类型:</span>
              <span className="bg-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                {getSensorIcon()} - {sensor.type === 'pressure' ? '渗压计' : sensor.type === 'water_level' ? '水位计' : '流量计'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">状态:</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  sensor.status === 'online'
                    ? 'bg-green-600'
                    : sensor.status === 'warning'
                    ? 'bg-yellow-600'
                    : 'bg-red-600'
                }`}
              >
                {getStatusText()}
              </span>
            </div>
            {sensor.status === 'offline' && (
              <div className="text-red-400 text-[10px] mt-1">
                ⚠️ 最后更新: {sensor.lastUpdate.toLocaleDateString()}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
