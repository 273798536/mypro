import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StormCloud as StormCloudType } from '../types';
import { latLngToVector3 } from '../utils/geo';

interface StormCloudProps {
  storm: StormCloudType;
}

const StormCloud = ({ storm }: StormCloudProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    const center = latLngToVector3(storm.centerLat, storm.centerLng, 0, 2)
      .clone()
      .normalize()
      .multiplyScalar(2.1);

    const particleCount = 200;
    const radiusScale = storm.radius / 500;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * radiusScale * 0.3;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const up = center.clone().normalize();
      const tangent1 = new THREE.Vector3(up.z, 0, -up.x).normalize();
      const tangent2 = new THREE.Vector3().crossVectors(up, tangent1).normalize();

      const offset = tangent1.multiplyScalar(x).add(tangent2.multiplyScalar(y)).add(up.multiplyScalar(z));
      const pos = center.clone().add(offset);

      positions.push(pos.x, pos.y, pos.z);

      const intensity = storm.intensity === 'severe' ? 0 : storm.intensity === 'moderate' ? 0.3 : 0.6;
      colors.push(0.2 + intensity, 0.2 + intensity, 0.3 + intensity);
      sizes.push(0.03 + Math.random() * 0.05);
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
    };
  }, [storm]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
    if (cloudRef.current) {
      const positions = cloudRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(state.clock.getElapsedTime() + i) * 0.0005;
      }
      cloudRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const boundaryColor = storm.intensity === 'severe' ? '#dc2626' : storm.intensity === 'moderate' ? '#f59e0b' : '#fbbf24';

  const boundaryRadius = storm.radius / 500 * 0.3;

  return (
    <group ref={groupRef}>
      <points ref={cloudRef} geometry={geometry} material={material} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boundaryRadius * 0.9, boundaryRadius, 64]} />
        <meshBasicMaterial
          color={boundaryColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[boundaryRadius * 0.95, boundaryRadius * 1.05, 64]} />
        <meshBasicMaterial
          color={boundaryColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default StormCloud;
