import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { SamplePoint, Measurement } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { calculateWaveHeight } from '@/utils/physicsEngine';

interface SamplePointMarkerProps {
  samplePoint: SamplePoint;
  onRemove?: () => void;
}

export function SamplePointMarker({ samplePoint, onRemove }: SamplePointMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { time, waveParams, obstacles, updateSamplePointMeasurement, isPlaying } = useAppStore();

  const lastUpdate = useRef(0);
  const currentHeight = useRef(0.3);

  useEffect(() => {
    const result = calculateWaveHeight(
      samplePoint.position.x,
      samplePoint.position.y,
      time,
      waveParams,
      obstacles
    );

    const measurement: Measurement = {
      amplitude: result.amplitude,
      phase: result.phase,
      frequency: (waveParams.source1.frequency + waveParams.source2.frequency) / 2,
      timestamp: Date.now(),
    };
    updateSamplePointMeasurement(samplePoint.id, measurement);
  }, []);

  useFrame(() => {
    if (!isPlaying) return;

    const now = Date.now();
    if (now - lastUpdate.current < 200) return;
    lastUpdate.current = now;

    const result = calculateWaveHeight(
      samplePoint.position.x,
      samplePoint.position.y,
      time,
      waveParams,
      obstacles
    );

    const newHeight = Math.max(0.1, result.height + 0.1);
    currentHeight.current = newHeight;

    if (meshRef.current) {
      meshRef.current.position.y = newHeight;
    }

    const measurement: Measurement = {
      amplitude: result.amplitude,
      phase: result.phase,
      frequency: (waveParams.source1.frequency + waveParams.source2.frequency) / 2,
      timestamp: now,
    };
    updateSamplePointMeasurement(samplePoint.id, measurement);
  });

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    if (onRemove) onRemove();
  };

  const latestMeasurement = samplePoint.measurements.length > 0
    ? samplePoint.measurements[samplePoint.measurements.length - 1]
    : null;

  const ampColor = latestMeasurement
    ? new THREE.Color().setHSL((240 - latestMeasurement.amplitude * 120) / 360, 0.8, 0.5)
    : new THREE.Color('#F4A261');

  const linePoints = useMemo(() => [
    new THREE.Vector3(samplePoint.position.x, 0, samplePoint.position.y),
    new THREE.Vector3(samplePoint.position.x, 0.5, samplePoint.position.y),
  ], [samplePoint.position.x, samplePoint.position.y]);

  return (
    <group>
      <Line
        points={linePoints}
        color="#F4A261"
        lineWidth={2}
        transparent
        opacity={0.6}
      />
      <mesh
        ref={meshRef}
        position={[samplePoint.position.x, 0.3, samplePoint.position.y]}
        onDoubleClick={handleDoubleClick}
      >
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color={ampColor}
          emissive={ampColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[samplePoint.position.x, 0.01, samplePoint.position.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.12, 16]} />
        <meshBasicMaterial color="#F4A261" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
