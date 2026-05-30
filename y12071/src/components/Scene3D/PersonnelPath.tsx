import { useMemo } from 'react';
import { Line, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PersonnelRoute as PersonnelRouteType } from '../../types';

interface PersonnelPathProps {
  route: PersonnelRouteType;
  showLabel?: boolean;
}

export function PersonnelPath({ route, showLabel }: PersonnelPathProps) {
  const points = useMemo(() => {
    return route.points.map(p => new THREE.Vector3(p[0], p[1] + 1.7, p[2]));
  }, [route.points]);

  return (
    <group>
      <Line
        points={points}
        color="#1E88E5"
        lineWidth={4}
        transparent
        opacity={0.8}
      />
      
      {points.map((point, index) => (
        <Sphere 
          key={index} 
          args={[0.12, 8, 8]} 
          position={point}
        >
          <meshStandardMaterial 
            color="#1E88E5" 
            emissive="#1E88E5" 
            emissiveIntensity={0.4}
          />
        </Sphere>
      ))}

      {points.length > 0 && (
        <>
          <Sphere args={[0.2, 8, 8]} position={points[0]}>
            <meshStandardMaterial color="#43A047" emissive="#43A047" emissiveIntensity={0.5} />
          </Sphere>
          
          <Sphere args={[0.2, 8, 8]} position={points[points.length - 1]}>
            <meshStandardMaterial color="#E53935" emissive="#E53935" emissiveIntensity={0.5} />
          </Sphere>

          {showLabel && (
            <>
              <Html position={[points[0].x, points[0].y + 0.5, points[0].z]} center distanceFactor={10}>
                <div className="bg-green-900 bg-opacity-90 text-green-200 text-xs px-2 py-1 rounded whitespace-nowrap border border-green-500">
                  🚶 起点: {route.name}
                </div>
              </Html>
              <Html position={[points[points.length - 1].x, points[points.length - 1].y + 0.5, points[points.length - 1].z]} center distanceFactor={10}>
                <div className="bg-red-900 bg-opacity-90 text-red-200 text-xs px-2 py-1 rounded whitespace-nowrap border border-red-500">
                  🏁 终点
                </div>
              </Html>
            </>
          )}
        </>
      )}
    </group>
  );
}
