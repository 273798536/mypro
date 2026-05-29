import { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import {
  CATEGORY_COLORS,
  MISJUDGED_COLOR,
  OVERLAP_COLOR,
  OUTLIER_COLOR,
} from '@/types';
import type { Sample } from '@/types';

function CameraController() {
  const { camera } = useThree();
  const pendingCameraMove = useStore((s) => s.pendingCameraMove);
  const clearPendingCameraMove = useStore((s) => s.clearPendingCameraMove);
  const setOnCameraCapture = useStore((s) => s.setOnCameraCapture);

  useEffect(() => {
    setOnCameraCapture(() => {
      const pos = camera.position;
      const ctrl = (camera as unknown as { userData?: { orbitTarget?: THREE.Vector3 } }).userData?.orbitTarget;
      return {
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        target: ctrl ? [ctrl.x, ctrl.y, ctrl.z] as [number, number, number] : [0, 0, 0] as [number, number, number],
      };
    });
    return () => setOnCameraCapture(null);
  }, [camera, setOnCameraCapture]);

  useEffect(() => {
    if (!pendingCameraMove) return;
    const { position, target } = pendingCameraMove;
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    clearPendingCameraMove();
  }, [pendingCameraMove, camera, clearPendingCameraMove]);

  return null;
}

function MisjudgedRing() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const t = performance.now() * 0.003;
    const s = 1.0 + 0.5 * (0.5 + 0.5 * Math.sin(t));
    ref.current.scale.setScalar(s);
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.6 + 0.6 * (0.5 + 0.5 * Math.sin(t));
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.4, 0.06, 8, 32]} />
      <meshStandardMaterial
        color={MISJUDGED_COLOR}
        emissive={MISJUDGED_COLOR}
        emissiveIntensity={0.6}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function SamplePoint({
  sample,
  position,
  isDimmed,
  isHovered,
  isSelected,
  isOutlier,
  onHover,
  onUnhover,
  onSelect,
}: {
  sample: Sample;
  position: [number, number, number];
  isDimmed: boolean;
  isHovered: boolean;
  isSelected: boolean;
  isOutlier: boolean;
  onHover: () => void;
  onUnhover: () => void;
  onSelect: () => void;
}) {
  const color = isOutlier
    ? OUTLIER_COLOR
    : CATEGORY_COLORS[sample.trueLabel] ?? '#ffffff';
  const isMisjudged = sample.isMisjudged;
  const radius = isMisjudged ? 0.28 : 0.2;
  const opacity = isDimmed ? 0.15 : 1;

  const handlePointerOver = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      onHover();
    },
    [onHover],
  );

  const handlePointerOut = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      onUnhover();
    },
    [onUnhover],
  );

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      onSelect();
    },
    [onSelect],
  );

  return (
    <group position={position}>
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 2.0 : 0.8}
          transparent={isDimmed}
          opacity={opacity}
        />
      </mesh>

      {isMisjudged && !isDimmed && <MisjudgedRing />}

      {isSelected && (
        <mesh>
          <sphereGeometry args={[radius + 0.08, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

function SamplePoints() {
  const samples = useStore((s) => s.samples);
  const projections = useStore((s) => s.projections);
  const selectedCategories = useStore((s) => s.selectedCategories);
  const outliers = useStore((s) => s.outliers);
  const showOutliers = useStore((s) => s.showOutliers);
  const hoveredSampleId = useStore((s) => s.hoveredSampleId);
  const selectedSampleId = useStore((s) => s.selectedSampleId);
  const setHoveredSampleId = useStore((s) => s.setHoveredSampleId);
  const setSelectedSampleId = useStore((s) => s.setSelectedSampleId);

  const sampleMap = useMemo(() => {
    const m = new Map<string, Sample>();
    for (const s of samples) m.set(s.id, s);
    return m;
  }, [samples]);

  const outlierMap = useMemo(() => {
    const m = new Map<string, [number, number, number]>();
    for (const o of outliers) m.set(o.sampleId, o.displacedPosition);
    return m;
  }, [outliers]);

  const outlierIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const o of outliers) s.add(o.sampleId);
    return s;
  }, [outliers]);

  const points = useMemo(() => {
    return projections
      .map((p) => {
        const sample = sampleMap.get(p.sampleId);
        if (!sample) return null;
        const isOutlier = outlierIdSet.has(p.sampleId);
        let pos: [number, number, number] = [p.x, p.y, p.z];
        if (isOutlier && showOutliers) {
          const displaced = outlierMap.get(p.sampleId);
          if (displaced) pos = displaced;
        }
        return { sample, position: pos, isOutlier };
      })
      .filter(Boolean) as {
      sample: Sample;
      position: [number, number, number];
      isOutlier: boolean;
    }[];
  }, [projections, sampleMap, outlierIdSet, showOutliers, outlierMap]);

  return (
    <group>
      {points.map(({ sample, position, isOutlier }) => {
        const isSelectedCat = selectedCategories.has(sample.trueLabel);
        const isDimmed = !isSelectedCat;
        const isHovered = hoveredSampleId === sample.id;
        const isSelected = selectedSampleId === sample.id;

        return (
          <SamplePoint
            key={sample.id}
            sample={sample}
            position={position}
            isDimmed={isDimmed}
            isHovered={isHovered}
            isSelected={isSelected}
            isOutlier={isOutlier}
            onHover={() => setHoveredSampleId(sample.id)}
            onUnhover={() => setHoveredSampleId(null)}
            onSelect={() => setSelectedSampleId(sample.id)}
          />
        );
      })}
    </group>
  );
}

function OverlapSpheres() {
  const overlapRegions = useStore((s) => s.overlapRegions);

  return (
    <group>
      {overlapRegions.map((region, i) => (
        <group key={i} position={region.center}>
          <mesh>
            <sphereGeometry args={[region.radius, 32, 32]} />
            <meshStandardMaterial
              color={OVERLAP_COLOR}
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[region.radius, 32, 32]} />
            <meshBasicMaterial
              color={OVERLAP_COLOR}
              wireframe
              transparent
              opacity={0.15}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function InstabilityLines() {
  const instabilityTrails = useStore((s) => s.instabilityTrails);
  const showInstability = useStore((s) => s.showInstability);

  const geometries = useMemo(() => {
    if (!showInstability) return [];

    const numSamples = instabilityTrails[0]?.length ?? 0;
    if (numSamples === 0 || instabilityTrails.length < 2) return [];

    const lines: { positions: Float32Array; count: number }[] = [];
    for (let si = 0; si < numSamples; si++) {
      const trailPositions = new Float32Array(instabilityTrails.length * 3);
      let valid = true;
      for (let ri = 0; ri < instabilityTrails.length; ri++) {
        const point = instabilityTrails[ri][si];
        if (!point) { valid = false; break; }
        trailPositions[ri * 3] = point.x;
        trailPositions[ri * 3 + 1] = point.y;
        trailPositions[ri * 3 + 2] = point.z;
      }
      if (valid) {
        lines.push({ positions: trailPositions, count: instabilityTrails.length });
      }
    }

    return lines.map(({ positions, count }) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return { geom, count };
    });
  }, [instabilityTrails, showInstability]);

  if (!showInstability || geometries.length === 0) return null;

  return (
    <group>
      {geometries.map(({ geom }, i) => (
        <primitive key={i} object={new THREE.Line(geom, new THREE.LineBasicMaterial({ color: '#888888', transparent: true, opacity: 0.3 }))} />
      ))}
    </group>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ background: '#0a0e1a' }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 8, 5]} intensity={0.8} color="#00ffc8" />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <Grid
        infiniteGrid
        fadeDistance={20}
        cellColor="#1a2040"
        sectionColor="#1a2040"
      />
      <CameraController />
      <SamplePoints />
      <OverlapSpheres />
      <InstabilityLines />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          intensity={1.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
