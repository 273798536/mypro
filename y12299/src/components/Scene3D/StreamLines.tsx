import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StreamLine } from '../../types';

interface StreamLinesProps {
  lines: StreamLine[];
}

export function StreamLines({ lines }: StreamLinesProps) {
  const particlesRef = useRef<THREE.Points>(null);

  const lineData = useMemo(() => {
    return lines.map((line) => {
      const points = line.points.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return { geometry, color: line.color };
    });
  }, [lines]);

  const particlePositions = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const speeds: number[] = [];

    lines.forEach((line) => {
      line.points.forEach((point, i) => {
        if (i % 3 === 0) {
          positions.push(point.x, point.y, point.z);
          const color = new THREE.Color(line.color);
          colors.push(color.r, color.g, color.b);
          speeds.push(point.velocity);
        }
      });
    });

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      speeds: new Float32Array(speeds),
    };
  }, [lines]);

  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;

      for (let i = 0; i < positions.length; i += 3) {
        const speedIndex = Math.floor(i / 3);
        const speed = particlePositions.speeds[speedIndex] || 1;
        const offset = (time * speed * 0.5) % 1;
        positions[i + 1] += Math.sin(time * 2 + i) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {lineData.map((line, index) => (
        <line key={`line-${index}`}>
          <bufferGeometry attach="geometry" {...line.geometry} />
          <lineBasicMaterial
            attach="material"
            color={line.color}
            transparent
            opacity={0.7}
          />
        </line>
      ))}

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.positions.length / 3}
            array={particlePositions.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particlePositions.colors.length / 3}
            array={particlePositions.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
