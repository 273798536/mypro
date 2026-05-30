import { useRef, useState } from 'react';
import { Sphere, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SupportPoint as SupportPointType } from '../../types';
import { useStore } from '../../store/useStore';

interface SupportNodeProps {
  support: SupportPointType;
  showLabel?: boolean;
}

const supportColors: Record<string, string> = {
  normal: '#43A047',
  offset: '#FB8C00',
  missing: '#E53935',
};

const supportTypeNames: Record<string, string> = {
  bolt: '锚杆',
  anchor: '锚索',
  mesh: '锚网',
};

export function SupportNode({ support, showLabel }: SupportNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const setSelectedDetectionId = useStore(state => state.setSelectedDetectionId);

  const color = supportColors[support.status] || '#666';
  const scale = hovered ? 1.2 : 1;

  const handleClick = () => {
    if (support.status !== 'normal') {
      const detectionId = support.status === 'offset' 
        ? `offset-${support.id}` 
        : `missing-${support.id}`;
      setSelectedDetectionId(detectionId);
    }
  };

  if (support.status === 'missing') {
    return (
      <group position={support.position}>
        <group onClick={handleClick}>
          <Sphere args={[0.15, 8, 8]}>
            <meshBasicMaterial color={color} transparent opacity={0.5} />
          </Sphere>
          <Sphere args={[0.25, 8, 8]}>
            <meshBasicMaterial color={color} transparent opacity={0.2} wireframe />
          </Sphere>
        </group>
        
        {showLabel && (
          <Html position={[0, 0.5, 0]} center distanceFactor={10}>
            <div className="bg-red-900 bg-opacity-90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-red-500">
              ⚠️ {supportTypeNames[support.type]}缺失
              <br />
              <span className="text-red-300">
                期望: ({support.expectedPosition.map(v => v.toFixed(1)).join(', ')})
              </span>
            </div>
          </Html>
        )}
      </group>
    );
  }

  return (
    <group position={support.position}>
      <group
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <Cylinder
          ref={meshRef}
          args={[0.05 * scale, 0.05 * scale, 0.8, 8]}
          position={[0, 0.4, 0]}
        >
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.2} />
        </Cylinder>
        
        <Sphere args={[0.12 * scale, 8, 8]} position={[0, 0, 0]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.2} />
        </Sphere>

        {support.status === 'offset' && support.offsetDistance && (
          <group>
            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([
                    support.expectedPosition[0] - support.position[0],
                    support.expectedPosition[1] - support.position[1],
                    support.expectedPosition[2] - support.position[2],
                    0, 0, 0,
                  ])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#FFA726" linewidth={2} />
            </lineSegments>
            
            <Sphere 
              args={[0.08, 8, 8]} 
              position={[
                support.expectedPosition[0] - support.position[0],
                support.expectedPosition[1] - support.position[1],
                support.expectedPosition[2] - support.position[2],
              ]}
            >
              <meshBasicMaterial color="#FFA726" transparent opacity={0.6} />
            </Sphere>
          </group>
        )}
      </group>

      {(showLabel || hovered) && (
        <Html position={[0, 0.8, 0]} center distanceFactor={10}>
          <div className={`text-xs px-2 py-1 rounded whitespace-nowrap border ${
            support.status === 'offset' 
              ? 'bg-orange-900 bg-opacity-90 border-orange-500 text-orange-200' 
              : 'bg-green-900 bg-opacity-90 border-green-500 text-green-200'
          }`}>
            {supportTypeNames[support.type]} {support.id.replace('sp-', '#')}
            {support.status === 'offset' && support.offsetDistance && (
              <><br /><span className="text-orange-300">偏移: {support.offsetDistance.toFixed(2)}m</span></>
            )}
            <br />
            <span className="opacity-70">
              坐标: ({support.position.map(v => v.toFixed(1)).join(', ')})
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
