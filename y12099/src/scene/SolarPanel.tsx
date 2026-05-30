import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { PanelProcessed, ShadowSeverity } from '../data/types';
import { panelHasNotes } from '../data/dataProcessor';

interface SolarPanelsProps {
  panels: PanelProcessed[];
  roofTilt: number;
  roofAzimuth: number;
  selectedPanelId: string | null;
  hoveredPanelId: string | null;
  highlightedPanelIds: Set<string>;
  diagnosticMap: Map<string, { severity: ShadowSeverity; hasAzimuth: boolean; hasSeason: boolean }>;
  onPanelClick: (panelId: string) => void;
  onPanelHover: (panelId: string | null) => void;
  currentHour: number;
}

const SEVERITY_COLORS: Record<ShadowSeverity, number> = {
  none: 0x3b82f6,
  low: 0x84cc16,
  medium: 0xfbbf24,
  high: 0xf97316,
  critical: 0xef4444,
};

export function SolarPanels({
  panels,
  roofTilt,
  selectedPanelId,
  hoveredPanelId,
  highlightedPanelIds,
  diagnosticMap,
  onPanelClick,
  onPanelHover,
  currentHour,
}: SolarPanelsProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tiltRad = (roofTilt * Math.PI) / 180;

  const { positions, colors, ids } = useMemo(() => {
    const positions: [number, number, number][] = [];
    const colors: number[] = [];
    const ids: string[] = [];

    panels.forEach((panel, i) => {
      positions.push([panel.x, panel.y, 0.15]);
      ids.push(panel.id);

      const diag = diagnosticMap.get(panel.id);
      let severity: ShadowSeverity = 'none';
      if (diag) {
        severity = diag.severity;
      }

      let color = SEVERITY_COLORS[severity];
      if (selectedPanelId === panel.id) {
        color = 0xffffff;
      } else if (hoveredPanelId === panel.id) {
        color = 0x60a5fa;
      } else if (highlightedPanelIds.size > 0 && !highlightedPanelIds.has(panel.id)) {
        color = 0x475569;
      }

      colors.push(color);
    });

    return { positions, colors, ids };
  }, [panels, diagnosticMap, selectedPanelId, hoveredPanelId, highlightedPanelIds]);

  useEffect(() => {
    if (!instancedMeshRef.current) return;

    const mesh = instancedMeshRef.current;
    const color = new THREE.Color();

    positions.forEach((pos, i) => {
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.setHex(colors[i]);
      mesh.setColorAt(i, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [positions, colors, dummy]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i !== undefined && ids[i]) {
      onPanelHover(ids[i]);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    onPanelHover(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i !== undefined && ids[i]) {
      onPanelClick(ids[i]);
    }
  };

  return (
    <group rotation={[-tiltRad, 0, 0]}>
      <instancedMesh
        ref={instancedMeshRef}
        key={panels.length}
        args={[undefined, undefined, Math.max(1, panels.length)]}
        castShadow
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[1.6, 0.95, 0.04]} />
        <meshStandardMaterial
          roughness={0.3}
          metalness={0.7}
          emissiveIntensity={0.05}
        />
      </instancedMesh>

      {panels.map((panel) => {
        const isSelected = selectedPanelId === panel.id;
        const isHovered = hoveredPanelId === panel.id;
        const hasNotes = panelHasNotes(panel);
        const isMissing = panel.isMissingFields;
        const diag = diagnosticMap.get(panel.id);
        const hasAzimuth = diag?.hasAzimuth || false;
        const hasSeason = diag?.hasSeason || false;

        if (!isSelected && !isHovered && !hasNotes && !isMissing && !hasAzimuth && !hasSeason) {
          return null;
        }

        return (
          <group key={panel.id} position={[panel.x, panel.y, 0.2]} rotation={[-tiltRad, 0, 0]}>
            {isSelected && (
              <mesh position={[0, 0, -0.1]}>
                <boxGeometry args={[1.8, 1.15, 0.01]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
              </mesh>
            )}
            {hasNotes && (
              <mesh position={[-0.6, 0.35, 0.05]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
              </mesh>
            )}
            {isMissing && (
              <mesh position={[0.6, 0.35, 0.05]} rotation-z={Math.PI / 4}>
                <ringGeometry args={[0.08, 0.12, 4]} />
                <meshBasicMaterial color="#f97316" side={THREE.DoubleSide} />
              </mesh>
            )}
            {hasAzimuth && (
              <mesh position={[-0.6, -0.35, 0.05]}>
                <torusGeometry args={[0.1, 0.03, 8, 16]} />
                <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
              </mesh>
            )}
            {hasSeason && (
              <mesh position={[0.6, -0.35, 0.05]}>
                <coneGeometry args={[0.1, 0.2, 4]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.3} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
