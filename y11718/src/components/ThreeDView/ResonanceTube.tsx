import { useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { Measurement } from '../../types';

interface TubeProps {
  measurements: Measurement[];
  frequency: number;
  temperature: number;
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}

function StandingWave({
  amplitude,
  wavelength,
  tubeLength,
  measurements,
  selectedNodeId,
  onNodeSelect,
}: {
  amplitude: number;
  wavelength: number;
  tubeLength: number;
  measurements: Measurement[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let x = 0; x <= tubeLength; x += 0.05) {
      const y = amplitude * Math.sin((2 * Math.PI * x) / wavelength);
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, [amplitude, wavelength, tubeLength]);

  const nodes = useMemo(() => {
    const nodePositions: { x: number; measurement: Measurement }[] = [];
    measurements.forEach((m) => {
      const x = m.tubeLength * 0.01;
      nodePositions.push({ x, measurement: m });
    });
    return nodePositions;
  }, [measurements]);

  return (
    <group>
      <Line
        points={points}
        color="#06B6D4"
        lineWidth={2}
        transparent
        opacity={0.8}
      />
      {nodes.map(({ x, measurement }, idx) => {
        const isSelected = selectedNodeId === measurement.id;
        const color = measurement.isOutlier ? '#F97316' : '#10B981';
        return (
          <group key={measurement.id} position={[x, 0, 0]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(isSelected ? null : measurement.id);
              }}
            >
              <sphereGeometry args={[isSelected ? 0.12 : 0.08, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.5 : 0.2}
              />
            </mesh>
            <Text
              position={[0, -0.3, 0.1]}
              fontSize={0.08}
              color="#94A3B8"
              anchorX="center"
              anchorY="middle"
            >
              {`n=${measurement.nodeNumber}`}
            </Text>
            <Text
              position={[0, -0.45, 0.1]}
              fontSize={0.06}
              color="#64748B"
              anchorX="center"
              anchorY="middle"
            >
              {`${measurement.tubeLength}cm`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function Tube({ length }: { length: number }) {
  const tubeGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.3, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 0.25, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
    const extrudeSettings = {
      steps: 1,
      depth: length,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [length]);

  return (
    <group rotation={[0, 0, -Math.PI / 2]}>
      <mesh geometry={tubeGeo} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#1E293B"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[length, 0, 0]}>
        <circleGeometry args={[0.25, 32]} />
        <meshStandardMaterial color="#334155" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function ScaleMarkers({ maxLength }: { maxLength: number }) {
  const markers = useMemo(() => {
    const m: { position: [number, number, number]; label: string }[] = [];
    for (let i = 0; i <= maxLength; i += 10) {
      m.push({
        position: [i * 0.01, -0.6, 0],
        label: `${i}`,
      });
    }
    return m;
  }, [maxLength]);

  return (
    <group>
      <Line
        points={[
          new THREE.Vector3(0, -0.5, 0),
          new THREE.Vector3(maxLength * 0.01, -0.5, 0),
        ]}
        color="#475569"
        lineWidth={1}
      />
      {markers.map((marker, idx) => (
        <group key={idx} position={marker.position}>
          <Line
            points={[
              new THREE.Vector3(0, 0.05, 0),
              new THREE.Vector3(0, -0.05, 0),
            ]}
            color="#475569"
            lineWidth={1}
          />
          <Text
            position={[0, -0.15, 0]}
            fontSize={0.05}
            color="#64748B"
            anchorX="center"
            anchorY="middle"
          >
            {marker.label}
          </Text>
        </group>
      ))}
      <Text
        position={[maxLength * 0.01 + 0.15, -0.5, 0]}
        fontSize={0.06}
        color="#94A3B8"
        anchorX="center"
        anchorY="middle"
      >
        cm
      </Text>
    </group>
  );
}

function Scene({
  measurements,
  frequency,
  temperature,
  selectedNodeId,
  onNodeSelect,
}: TubeProps) {
  const maxLength = Math.max(...measurements.map((m) => m.tubeLength), 100);
  const wavelength = (340 / frequency) * 100;
  const normalizedWavelength = wavelength * 0.01;
  const tubeDisplayLength = maxLength * 0.01 + 0.5;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (state.camera instanceof THREE.PerspectiveCamera) {
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#06B6D4" />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={15}
      />

      <group position={[-tubeDisplayLength / 2 + 0.3, 0, 0]}>
        <Tube length={tubeDisplayLength} />
        <StandingWave
          amplitude={0.3}
          wavelength={normalizedWavelength}
          tubeLength={maxLength * 0.01}
          measurements={measurements}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
        />
        <ScaleMarkers maxLength={maxLength} />
      </group>

      <gridHelper args={[20, 20, '#1E293B', '#0F172A']} position={[0, -1.5, 0]} />
    </>
  );
}

export default function ResonanceTube3D(props: TubeProps) {
  if (props.measurements.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg">
        <p className="text-slate-400 text-sm">请先导入或创建实验数据</p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [3, 2, 4], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
