import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SpectrumFrame, VisualParams, PeakMarker } from '../../types';
import { energyToColor, energyToHeight, frequencyToX, timeToZ } from '../../utils/colorMapper';

interface SpectrumBarsProps {
  frames: SpectrumFrame[];
  duration: number;
  sampleRate: number;
  params: VisualParams;
  peaks: PeakMarker[];
  selectedPeak: PeakMarker | null;
  hoveredPeak: PeakMarker | null;
  onPeakHover: (peak: PeakMarker | null) => void;
  onPeakSelect: (peak: PeakMarker | null) => void;
}

export function SpectrumBars({
  frames,
  duration,
  params,
  peaks,
  selectedPeak,
  hoveredPeak,
  onPeakHover,
  onPeakSelect,
}: SpectrumBarsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const { barCount, positions, colors, heights } = useMemo(() => {
    const maxFrames = Math.min(frames.length, 100);
    const step = Math.max(1, Math.floor(frames.length / maxFrames));
    const displayFrames = [];

    for (let i = 0; i < frames.length; i += step) {
      displayFrames.push(frames[i]);
    }

    const numBars = displayFrames.length * params.freqMax;
    const positions: Array<[number, number, number, number]> = [];
    const colors: string[] = [];
    const heights: number[] = [];

    for (let fi = 0; fi < displayFrames.length; fi++) {
      const frame = displayFrames[fi];
      const z = timeToZ(frame.time, duration, 20);

      for (let fri = 0; fri < frame.frequencies.length; fri++) {
        const freq = (fri / frame.frequencies.length) * (params.freqMax - params.freqMin) + params.freqMin;
        const energy = frame.frequencies[fri];

        if (energy < params.energyThreshold) continue;

        const x = frequencyToX(freq, params.freqMin, params.freqMax, 20);
        const height = energyToHeight(energy, params.energyThreshold, 12);
        const col = energyToColor(energy, params.energyThreshold);

        positions.push([x, height / 2, z, height]);
        colors.push('#' + col.getHexString());
        heights.push(height);
      }
    }

    return { barCount: positions.length, positions, colors, heights };
  }, [frames, duration, params]);

  useMemo(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < barCount; i++) {
      const [x, y, z, h] = positions[i];
      dummy.position.set(x, y, z);
      dummy.scale.set(0.15, Math.max(0.01, h), 0.15);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, color.set(colors[i]));
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [barCount, positions, colors, dummy, color]);

  const peakMarkers = useMemo(() => {
    return peaks.slice(0, 20).map((peak, idx) => {
      const x = frequencyToX(peak.frequency, params.freqMin, params.freqMax, 20);
      const z = timeToZ(peak.time, duration, 20);
      const y = energyToHeight(peak.energy, params.energyThreshold, 12) + 0.5;
      const isSelected = selectedPeak?.frameIndex === peak.frameIndex && selectedPeak?.freqIndex === peak.freqIndex;
      const isHovered = hoveredPeak?.frameIndex === peak.frameIndex && hoveredPeak?.freqIndex === peak.freqIndex;

      return (
        <group key={`peak-${idx}`}>
          <mesh
            position={[x, y, z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onPeakHover(peak);
            }}
            onPointerOut={() => onPeakHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onPeakSelect(peak);
            }}
          >
            <sphereGeometry args={[isSelected || isHovered ? 0.4 : 0.25, 16, 16]} />
            <meshBasicMaterial
              color={isSelected ? '#ffffff' : isHovered ? '#ffd700' : '#ff6b35'}
              transparent
              opacity={isSelected ? 1 : 0.9}
            />
          </mesh>
          {(isSelected || isHovered) && (
            <mesh position={[x, y, z]}>
              <ringGeometry args={[0.5, 0.6, 32]} />
              <meshBasicMaterial color="#ff6b35" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      );
    });
  }, [peaks, duration, params, selectedPeak, hoveredPeak, onPeakHover, onPeakSelect]);

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, Math.max(barCount, 1)]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          transparent
          opacity={params.barOpacity}
          roughness={0.3}
          metalness={0.1}
        />
      </instancedMesh>
      {peakMarkers}
    </group>
  );
}
