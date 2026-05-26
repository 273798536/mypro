import { useRef } from 'react';
import { Html, Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Alert } from '../../types';

interface AlertMarkersProps {
  alerts: Alert[];
  showResolved?: boolean;
}

const ALERT_COLORS: Record<string, string> = {
  coordinate_flip: '#EF4444',
  heat_overflow: '#F59E0B',
  trajectory_collision: '#EF4444',
  data_invalid: '#8B5CF6',
  out_of_bounds: '#F59E0B',
};

function AlertMarker({ alert }: { alert: Alert }) {
  const meshRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y =
        (alert.position?.y || 2) + Math.sin(Date.now() * 0.002) * 0.3;
      meshRef.current.rotation.y += delta * 2;
    }
  });

  const color = ALERT_COLORS[alert.type] || '#EF4444';

  if (!alert.position) return null;

  return (
    <group position={[alert.position.x, alert.position.y + 2, alert.position.z]}>
      <Sphere ref={meshRef} args={[0.4, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </Sphere>

      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <Html position={[0, 1.5, 0]} center distanceFactor={20}>
        <div
          className={`px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border ${
            alert.resolved
              ? 'bg-gray-600 border-gray-500'
              : 'bg-red-900 bg-opacity-90 border-red-600'
          } text-white`}
        >
          <div className="font-bold">
            {alert.type === 'coordinate_flip' && '坐标翻转'}
            {alert.type === 'heat_overflow' && '热度异常'}
            {alert.type === 'trajectory_collision' && '轨迹穿墙'}
            {alert.type === 'data_invalid' && '数据无效'}
            {alert.type === 'out_of_bounds' && '越界'}
          </div>
          <div className="text-gray-300 text-[10px]">
            {alert.source.fileName}:{alert.source.lineNumber}
          </div>
        </div>
      </Html>
    </group>
  );
}

export function AlertMarkers({ alerts, showResolved = false }: AlertMarkersProps) {
  const visibleAlerts = alerts.filter(
    (alert) => alert.position && (showResolved || !alert.resolved)
  );

  return (
    <group>
      {visibleAlerts.map((alert) => (
        <AlertMarker key={alert.id} alert={alert} />
      ))}
    </group>
  );
}
