import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '../../store/useAppStore';
import * as THREE from 'three';

const PathVisualization = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { plannedPath, nodes } = useAppStore();
  
  useFrame((state) => {
    if (meshRef.current && plannedPath) {
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.3 + 0.7;
      material.opacity = pulse;
    }
  });
  
  if (plannedPath && plannedPath.nodes.length >= 2) {
    const points: THREE.Vector3[] = [];
    plannedPath.nodes.forEach((nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        points.push(new THREE.Vector3(node.x, 2, node.y));
      }
    });
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.2, 8, false);
    
    return (
      <group>
        <mesh ref={meshRef} geometry={tubeGeometry}>
          <meshBasicMaterial 
            color="#22c55e" 
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {points.map((point, i) => (
          <mesh key={i} position={[point.x, point.y + 0.5, point.z]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial 
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
      </group>
    );
  }
  
  return null;
};

export default PathVisualization;
