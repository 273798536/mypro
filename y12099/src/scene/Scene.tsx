import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Outline, Selection, Select } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Roof } from './Roof';
import { SolarPanels } from './SolarPanel';
import { Obstacles } from './Obstacle';
import type {
  Roof as RoofType,
  PanelProcessed,
  Obstacle as ObstacleType,
  Season,
  ShadowSeverity,
  CameraView,
} from '../data/types';
import { getSunPositionForUI } from '../engine/shadowCalculator';
import { useAppStore } from '../store/useAppStore';

interface SceneContentProps {
  roof: RoofType;
  panels: PanelProcessed[];
  obstacles: ObstacleType[];
  selectedPanelId: string | null;
  hoveredPanelId: string | null;
  highlightedPanelIds: Set<string>;
  diagnosticMap: Map<string, { severity: ShadowSeverity; hasAzimuth: boolean; hasSeason: boolean }>;
  currentHour: number;
  currentSeason: Season;
  onPanelClick: (panelId: string) => void;
  onPanelHover: (panelId: string | null) => void;
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
  restoreView: CameraView | null;
}

function SunLight({ hour, season, roofAzimuth }: { hour: number; season: Season; roofAzimuth: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  useFrame(() => {
    if (!lightRef.current) return;

    const sunPos = getSunPositionForUI(hour, season);
    const altRad = (sunPos.altitude * Math.PI) / 180;
    const azRad = ((sunPos.azimuth - roofAzimuth) * Math.PI) / 180;

    const distance = 30;
    const x = distance * Math.sin(azRad) * Math.cos(altRad);
    const y = distance * Math.sin(altRad);
    const z = distance * Math.cos(azRad) * Math.cos(altRad);

    lightRef.current.position.set(x, y, z);
    lightRef.current.target.position.set(0, 0, 0);
    lightRef.current.target.updateMatrixWorld();

    const intensity = sunPos.altitude > 0 ? Math.max(0.2, Math.sin(altRad)) : 0;
    lightRef.current.intensity = intensity;

    const color = new THREE.Color();
    if (sunPos.altitude < 10) {
      color.setHSL(0.05, 0.8, 0.6);
    } else if (sunPos.altitude < 30) {
      color.setHSL(0.1, 0.6, 0.8);
    } else {
      color.setHSL(0.12, 0.1, 0.95);
    }
    lightRef.current.color = color;
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-bias={-0.0001}
      />
      <primitive object={targetRef.current} />
    </>
  );
}

function CameraController({
  view,
  controlsRef,
}: {
  view: CameraView | null;
  controlsRef: React.MutableRefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (!view || !controlsRef.current) return;

    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const endPos = new THREE.Vector3(...view.position);
    const endTarget = new THREE.Vector3(...view.target);

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      camera.position.lerpVectors(startPos, endPos, ease);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, ease);
      controlsRef.current.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [view, camera, controlsRef]);

  return null;
}

function SceneContent({
  roof,
  panels,
  obstacles,
  selectedPanelId,
  hoveredPanelId,
  highlightedPanelIds,
  diagnosticMap,
  currentHour,
  currentSeason,
  onPanelClick,
  onPanelHover,
  onCameraChange,
  restoreView,
}: SceneContentProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastCameraUpdate = useRef(0);

  useFrame(() => {
    const now = Date.now();
    if (now - lastCameraUpdate.current > 100 && controlsRef.current) {
      lastCameraUpdate.current = now;
      const pos = camera.position;
      const target = controlsRef.current.target;
      onCameraChange(
        [pos.x, pos.y, pos.z],
        [target.x, target.y, target.z]
      );
    }
  });

  const outlineSelection = useMemo(() => {
    const ids: string[] = [];
    if (selectedPanelId) ids.push(selectedPanelId);
    if (hoveredPanelId && hoveredPanelId !== selectedPanelId) ids.push(hoveredPanelId);
    return ids;
  }, [selectedPanelId, hoveredPanelId]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minPolarAngle={0.1}
      />

      <hemisphereLight args={['#60a5fa', '#1e293b', 0.4]} />
      <ambientLight intensity={0.2} />
      <SunLight hour={currentHour} season={currentSeason} roofAzimuth={roof.azimuth} />

      <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={0.5} />

      <Selection>
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
            intensity={0.5}
          />
          {outlineSelection.length > 0 && (
            <Outline
              visibleEdgeColor={0x3b82f6}
              hiddenEdgeColor={0x1d4ed8}
              edgeStrength={2}
              pulseSpeed={0.5}
              blur
              xRay
            />
          )}
        </EffectComposer>

        <CameraController view={restoreView} controlsRef={controlsRef} />

        <group>
          <Roof roof={roof} />
          <SolarPanels
            panels={panels}
            roofTilt={roof.tilt}
            roofAzimuth={roof.azimuth}
            selectedPanelId={selectedPanelId}
            hoveredPanelId={hoveredPanelId}
            highlightedPanelIds={highlightedPanelIds}
            diagnosticMap={diagnosticMap}
            onPanelClick={onPanelClick}
            onPanelHover={onPanelHover}
            currentHour={currentHour}
          />
          <Obstacles obstacles={obstacles} roofTilt={roof.tilt} />

          {selectedPanelId && (
            <Select enabled>
              <mesh position={[0, -2, 0]}>
                <boxGeometry args={[0.1, 0.1, 0.1]} />
                <meshBasicMaterial />
              </mesh>
            </Select>
          )}
        </group>
      </Selection>
    </>
  );
}

interface Scene3DProps {
  roof: RoofType;
  panels: PanelProcessed[];
  obstacles: ObstacleType[];
  diagnosticMap: Map<string, { severity: ShadowSeverity; hasAzimuth: boolean; hasSeason: boolean }>;
  highlightedPanelIds: Set<string>;
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
  restoreView: CameraView | null;
}

export function Scene3D({
  roof,
  panels,
  obstacles,
  diagnosticMap,
  highlightedPanelIds,
  onCameraChange,
  restoreView,
}: Scene3DProps) {
  const selectedPanelId = useAppStore((s) => s.selectedPanelId);
  const hoveredPanelId = useAppStore((s) => s.hoveredPanelId);
  const currentHour = useAppStore((s) => s.currentHour);
  const currentSeason = useAppStore((s) => s.currentSeason);
  const setSelectedPanelId = useAppStore((s) => s.setSelectedPanelId);
  const setHoveredPanelId = useAppStore((s) => s.setHoveredPanelId);
  const focusPanel = useAppStore((s) => s.focusPanel);

  const handlePanelClick = (panelId: string) => {
    if (selectedPanelId === panelId) {
      setSelectedPanelId(null);
    } else {
      focusPanel(panelId);
    }
  };

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 30, 60]} />
        <SceneContent
          roof={roof}
          panels={panels}
          obstacles={obstacles}
          selectedPanelId={selectedPanelId}
          hoveredPanelId={hoveredPanelId}
          highlightedPanelIds={highlightedPanelIds}
          diagnosticMap={diagnosticMap}
          currentHour={currentHour}
          currentSeason={currentSeason}
          onPanelClick={handlePanelClick}
          onPanelHover={setHoveredPanelId}
          onCameraChange={onCameraChange}
          restoreView={restoreView}
        />
      </Canvas>
    </div>
  );
}
