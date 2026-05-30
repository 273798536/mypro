import { useState } from 'react';
import { Sphere, Html } from '@react-three/drei';
import { DetectionResult } from '../../types';
import { useStore } from '../../store/useStore';

interface DetectionMarkerProps {
  detection: DetectionResult;
  isSelected: boolean;
}

const severityColors: Record<string, string> = {
  high: '#E53935',
  medium: '#FB8C00',
  low: '#FFC107',
};

const typeIcons: Record<string, string> = {
  offset: '📐',
  missing_support: '🔧',
  sensor_offline: '📡',
  route_conflict: '⚠️',
};

const typeNames: Record<string, string> = {
  offset: '坐标偏移',
  missing_support: '支护缺失',
  sensor_offline: '传感器异常',
  route_conflict: '路线冲突',
};

export function DetectionMarker({ detection, isSelected }: DetectionMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const setSelectedDetectionId = useStore(state => state.setSelectedDetectionId);
  
  const color = severityColors[detection.severity];
  const baseSize = detection.severity === 'high' ? 0.4 : detection.severity === 'medium' ? 0.3 : 0.25;
  const size = (hovered || isSelected) ? baseSize * 1.3 : baseSize;

  return (
    <group position={detection.position}>
      <group
        onClick={() => setSelectedDetectionId(detection.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <Sphere args={[size, 12, 12]}>
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </Sphere>
        
        <Sphere args={[size * 1.5, 12, 12]}>
          <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
        </Sphere>

        {detection.offset && (
          <group>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    0, 0, 0,
                    detection.offset.direction[0] * detection.offset.distance,
                    detection.offset.direction[1] * detection.offset.distance,
                    detection.offset.direction[2] * detection.offset.distance,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#FFA726" linewidth={3} />
            </lineSegments>
          </group>
        )}

        {detection.affectedByRoute && (
          <Sphere args={[size * 2, 8, 8]}>
            <meshBasicMaterial color="#1E88E5" transparent opacity={0.1} wireframe />
          </Sphere>
        )}
      </group>

      {(hovered || isSelected) && (
        <Html position={[0, size + 0.5, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div className={`min-w-48 text-xs px-3 py-2 rounded-lg whitespace-nowrap border-2 shadow-lg ${
            isSelected 
              ? 'bg-slate-900 border-blue-500 text-white' 
              : 'bg-slate-800 bg-opacity-95 border-slate-600 text-white'
          }`}>
            <div className="font-bold text-sm mb-1 flex items-center gap-2">
              <span>{typeIcons[detection.type]}</span>
              <span>{typeNames[detection.type]}</span>
              {detection.affectedByRoute && (
                <span className="text-blue-400 text-xs bg-blue-900 px-1.5 py-0.5 rounded">
                  受路线影响
                </span>
              )}
            </div>
            <div className="text-slate-300 mb-1">{detection.description}</div>
            <div className="text-slate-400 text-xs">
              位置: ({detection.position.map(v => v.toFixed(2)).join(', ')})
            </div>
            {detection.offset && (
              <div className="text-orange-400 text-xs mt-1">
                偏移向量: ({detection.offset.direction.map(v => v.toFixed(2)).join(', ')})
                <br />
                偏移距离: {detection.offset.distance.toFixed(3)}m
              </div>
            )}
          </div>
        </Html>
      )}

      <Html position={[size + 0.2, size, 0]} center distanceFactor={10}>
        <div 
          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
            detection.severity === 'high' 
              ? 'bg-red-600 text-white' 
              : detection.severity === 'medium'
              ? 'bg-orange-500 text-white'
              : 'bg-yellow-500 text-black'
          }`}
        >
          {detection.severity === 'high' ? '高' : detection.severity === 'medium' ? '中' : '低'}
        </div>
      </Html>
    </group>
  );
}
