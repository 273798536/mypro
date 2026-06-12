import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanktonSample } from '@/types';
import { getSpeciesColor, getRiskColor, getCountSize, hexToRgb } from '@/utils/colorUtils';
import { useSampleStore } from '@/store/useSampleStore';
import { useReviewStore } from '@/store/useReviewStore';

interface PlanktonCloudProps {
  samples: PlanktonSample[];
  colorBy: 'species' | 'risk' | 'layer';
}

export default function PlanktonCloud({ samples, colorBy }: PlanktonCloudProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  const { selectedSampleId, hoveredSampleId, selectSample, hoverSample } = useSampleStore();
  const { isReviewMode } = useReviewStore();

  const sampleIds = useMemo(() => samples.map((s) => s.id), [samples]);

  useFrame((state) => {
    if (!meshRef.current || !glowMeshRef.current) return;
    const time = state.clock.elapsedTime;

    samples.forEach((sample, i) => {
      const isSelected = sample.id === selectedSampleId;
      const isHovered = sample.id === hoveredSampleId;

      const floatOffset = Math.sin(time * 0.5 + i * 0.3) * 0.1;
      const driftX = Math.sin(time * 0.3 + i * 0.5) * 0.05;
      const driftZ = Math.cos(time * 0.4 + i * 0.7) * 0.05;

      dummy.position.set(sample.x + driftX, sample.y + floatOffset, sample.z + driftZ);

      let size = getCountSize(sample.count);
      if (isSelected) size *= 1.8;
      else if (isHovered) size *= 1.4;

      dummy.scale.setScalar(size);
      dummy.rotation.set(time * 0.2 + i, time * 0.3 + i * 0.5, time * 0.1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      let color: string;
      if (colorBy === 'species') color = getSpeciesColor(sample.species);
      else if (colorBy === 'risk') color = getRiskColor(sample.riskLevel);
      else color = getRiskColor(sample.riskLevel);

      const rgb = hexToRgb(color);
      if (isSelected) {
        colorObj.setRGB(rgb.r * 1.3, rgb.g * 1.3, rgb.b * 1.3);
      } else if (isHovered) {
        colorObj.setRGB(rgb.r * 1.15, rgb.g * 1.15, rgb.b * 1.15);
      } else {
        colorObj.setRGB(rgb.r, rgb.g, rgb.b);
      }

      meshRef.current!.setColorAt(i, colorObj);

      if (isSelected || isHovered || sample.riskLevel === 'high' || sample.riskLevel === 'medium') {
        dummy.scale.setScalar(size * (isSelected ? 2.8 : 2.0));
        dummy.updateMatrix();
        glowMeshRef.current!.setMatrixAt(i, dummy.matrix);
        const glowColor = sample.riskLevel === 'high'
          ? hexToRgb('#E63946')
          : sample.riskLevel === 'medium'
          ? hexToRgb('#FF9F1C')
          : hexToRgb('#00D4AA');
        colorObj.setRGB(glowColor.r, glowColor.g, glowColor.b);
        glowMeshRef.current!.setColorAt(i, colorObj);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        glowMeshRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
    if (glowMeshRef.current.instanceColor) glowMeshRef.current.instanceColor.needsUpdate = true;
  });

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.userData.sampleIds = sampleIds;
    }
  }, [sampleIds]);

  const handlePointerMissed = () => {
    hoverSample(null);
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx !== undefined && samples[idx]) {
      hoverSample(samples[idx].id);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    hoverSample(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const idx = e.instanceId;
    if (idx !== undefined && samples[idx]) {
      selectSample(samples[idx].id);
    }
  };

  return (
    <group onPointerMissed={handlePointerMissed}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(samples.length, 1)]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          transparent
          opacity={0.85}
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.4}
          toneMapped={false}
        />
      </instancedMesh>

      <instancedMesh ref={glowMeshRef} args={[undefined, undefined, Math.max(samples.length, 1)]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial transparent opacity={0.25} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
