import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { generateSlices, evaluateFunction } from '@/utils/calculus';
import { Axis, SliceData } from '@/types/game';

interface SliceMeshProps {
  slice: SliceData;
  xOffset: number;
  delay: number;
  color: string;
}

const SliceMesh: React.FC<SliceMeshProps> = ({ slice, xOffset, delay, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useFrame((state) => {
    if (meshRef.current && visible) {
      meshRef.current.scale.setScalar(Math.min(1, meshRef.current.scale.x + 0.05));
    }
  });

  const geometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(
      slice.radius,
      slice.radius,
      slice.thickness,
      32
    );
    geom.rotateZ(Math.PI / 2);
    geom.translate(xOffset, 0, 0);
    return geom;
  }, [slice.radius, slice.thickness, xOffset]);

  if (!visible) return null;

  return (
    <group ref={meshRef as any} scale={0.01}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.8}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <lineSegments geometry={new THREE.EdgesGeometry(geometry)}>
        <lineBasicMaterial color="#38BDF8" />
      </lineSegments>
    </group>
  );
};

interface SolidMeshProps {
  expr: string;
  interval: [number, number];
  axis: Axis;
}

const SolidMesh: React.FC<SolidMeshProps> = ({ expr, interval, axis }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const [a, b] = interval;
    const steps = 100;
    const dx = (b - a) / steps;

    for (let i = 0; i <= steps; i++) {
      const x = a + i * dx;
      const y = Math.abs(evaluateFunction(expr, x));
      points.push(new THREE.Vector2(y, x - (a + b) / 2));
    }

    const geom = new THREE.LatheGeometry(points, 64);
    if (axis === 'y') {
      geom.rotateZ(Math.PI / 2);
    }
    return geom;
  }, [expr, interval, axis]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#165DFF"
        transparent
        opacity={0.6}
        metalness={0.2}
        roughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface AxisLineProps {
  axis: Axis;
  length: number;
}

const AxisLine: React.FC<AxisLineProps> = ({ axis, length }) => {
  const points = useMemo(() => {
    if (axis === 'x') {
      return [new THREE.Vector3(-length / 2, 0, 0), new THREE.Vector3(length / 2, 0, 0)];
    }
    return [new THREE.Vector3(0, -length / 2, 0), new THREE.Vector3(0, length / 2, 0)];
  }, [axis, length]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [points]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#F53F3F" linewidth={3} />
    </lineSegments>
  );
};

interface SolidOfRevolutionProps {
  expr: string;
  interval: [number, number];
  axis: Axis;
  sliceCount?: number;
  showSlices?: boolean;
  showSolid?: boolean;
  width?: number;
  height?: number;
}

export const SolidOfRevolution: React.FC<SolidOfRevolutionProps> = ({
  expr,
  interval,
  axis,
  sliceCount = 20,
  showSlices = true,
  showSolid = true,
  width = 500,
  height = 400,
}) => {
  const slices = useMemo(() => {
    return generateSlices(expr, interval, sliceCount, axis);
  }, [expr, interval, sliceCount, axis]);

  const xOffset = -(interval[0] + interval[1]) / 2;

  return (
    <div className="relative rounded-lg overflow-hidden border border-factory-border bg-factory-bg">
      <Canvas
        camera={{ position: [3, 3, 3], fov: 50 }}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#165DFF" />
        <pointLight position={[0, 3, 0]} intensity={0.5} color="#38BDF8" />

        <gridHelper args={[8, 8, '#334155', '#1E293B']} position={[0, -2, 0]} />

        <AxisLine axis={axis} length={6} />

        {showSolid && (
          <SolidMesh expr={expr} interval={interval} axis={axis} />
        )}

        {showSlices && slices.map((slice, i) => (
          <SliceMesh
            key={slice.index}
            slice={slice}
            xOffset={xOffset + slice.x}
            delay={i * 80}
            color={i % 2 === 0 ? '#38BDF8' : '#165DFF'}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
        />
      </Canvas>

      <div className="absolute inset-0 pointer-events-none noise-overlay" />

      <div className="absolute top-3 left-3 bg-factory-panel/80 backdrop-blur-sm px-3 py-1.5 rounded-md border border-factory-border">
        <span className="text-xs font-mono text-factory-text">
          {axis.toUpperCase()}轴旋转 · {sliceCount}片
        </span>
      </div>
    </div>
  );
};
