import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Annotation, Anomaly } from '../../types';
import { getAnomalyColor, getAnomalyIcon } from '../../utils/colorMap';

interface AnnotationsProps {
  annotations: Annotation[];
  anomalies: Anomaly[];
}

export function Annotations({ annotations, anomalies }: AnnotationsProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.lookAt(camera.position);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {anomalies.map((anomaly) => (
        <group key={anomaly.id} position={[anomaly.position.x, anomaly.position.y + 0.5, anomaly.position.z]}>
          <mesh>
            <ringGeometry args={[0.2, 0.3, 6]} />
            <meshBasicMaterial color={getAnomalyColor(anomaly.type)} side={THREE.DoubleSide} />
          </mesh>
          <Html center distanceFactor={10}>
            <div className="annotation-label flex items-center gap-1 bg-black/70 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ color: getAnomalyColor(anomaly.type) }}>
              <span>{getAnomalyIcon(anomaly.type)}</span>
              <span className="font-mono font-bold">Step {anomaly.step}</span>
            </div>
          </Html>
        </group>
      ))}
      
      {annotations.map((annotation) => (
        <group key={annotation.id} position={annotation.position}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color={annotation.color} />
          </mesh>
          <Html center distanceFactor={10}>
            <div className="annotation-label bg-black/70 px-2 py-1 rounded text-xs whitespace-nowrap" style={{ color: annotation.color }}>
              <span className="font-bold">{annotation.label}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
