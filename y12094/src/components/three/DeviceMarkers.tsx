import { useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { monitoringDevices } from '@/data/mockData';
import useAppStore from '@/store/useAppStore';

export default function DeviceMarkers() {
  const showDevices = useAppStore((state) => state.showDevices);
  const hoveredObject = useAppStore((state) => state.hoveredObject);
  const setHoveredObject = useAppStore((state) => state.setHoveredObject);
  const groupRef = useRef<THREE.Group>(null);

  if (!showDevices) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#22c55e';
      case 'warning': return '#eab308';
      case 'error': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <group ref={groupRef}>
      {monitoringDevices.map((device) => (
        <group
          key={device.id}
          position={device.position as [number, number, number]}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredObject(device.id);
          }}
          onPointerOut={() => setHoveredObject(null)}
        >
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 5.5, 0]}>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshStandardMaterial
              color={getStatusColor(device.status)}
              emissive={getStatusColor(device.status)}
              emissiveIntensity={hoveredObject === device.id ? 0.8 : 0.3}
            />
          </mesh>
          {hoveredObject === device.id && (
            <Html position={[0, 7, 0]} center distanceFactor={10}>
              <div className="bg-slate-900/95 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap border border-slate-700 shadow-xl">
                <div className="font-medium">{device.name}</div>
                <div className="text-slate-400 text-xs">
                  状态: <span style={{ color: getStatusColor(device.status) }}>{device.status}</span>
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}
