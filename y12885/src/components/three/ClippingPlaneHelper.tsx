import { useMemo } from 'react';
import * as THREE from 'three';
import { ClippingPlanesState } from '../../types';

interface ClippingPlaneHelperProps {
  clippingPlanes: ClippingPlanesState;
  onPlaneChange: (axis: 'x' | 'y' | 'z', value: number) => void;
}

export default function ClippingPlaneHelper({ clippingPlanes, onPlaneChange }: ClippingPlaneHelperProps) {
  const planes = useMemo(() => {
    const result: THREE.Plane[] = [];
    
    if (clippingPlanes.x.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), clippingPlanes.x.value));
    }
    if (clippingPlanes.y.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), clippingPlanes.y.value));
    }
    if (clippingPlanes.z.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), clippingPlanes.z.value));
    }
    
    return result;
  }, [clippingPlanes]);

  return (
    <group>
      {clippingPlanes.x.enabled && (
        <mesh position={[clippingPlanes.x.value, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#3E92CC"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(100, 100)]} />
            <lineBasicMaterial color="#3E92CC" opacity={0.5} transparent />
          </lineSegments>
        </mesh>
      )}
      
      {clippingPlanes.y.enabled && (
        <mesh position={[0, clippingPlanes.y.value, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#2ECC71"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(100, 100)]} />
            <lineBasicMaterial color="#2ECC71" opacity={0.5} transparent />
          </lineSegments>
        </mesh>
      )}
      
      {clippingPlanes.z.enabled && (
        <mesh position={[0, 0, clippingPlanes.z.value]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial
            color="#F39C12"
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(100, 100)]} />
            <lineBasicMaterial color="#F39C12" opacity={0.5} transparent />
          </lineSegments>
        </mesh>
      )}
    </group>
  );
}

export function useClippingPlanes(clippingPlanes: ClippingPlanesState): THREE.Plane[] {
  return useMemo(() => {
    const result: THREE.Plane[] = [];
    
    if (clippingPlanes.x.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), clippingPlanes.x.value));
    }
    if (clippingPlanes.y.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), clippingPlanes.y.value));
    }
    if (clippingPlanes.z.enabled) {
      result.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), clippingPlanes.z.value));
    }
    
    return result;
  }, [clippingPlanes]);
}
