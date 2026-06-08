import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useDataStore, planeWorldPosition } from "@/store/dataStore";
import { useGameStore } from "@/store/gameStore";
import type { NormalAxis, SectionPlane, SectionStatus } from "@/types";

const PLANE_SIZE = 60;

interface SingleSectionPlaneProps {
  plane: SectionPlane;
  isSelected: boolean;
}

function planeRotation(normalAxis: NormalAxis): [number, number, number] {
  switch (normalAxis) {
    case "X":
      return [0, Math.PI / 2, 0];
    case "Y":
      return [-Math.PI / 2, 0, 0];
    case "Z":
      return [0, 0, 0];
  }
}

function statusColor(status: SectionStatus, isSelected: boolean) {
  if (status === "overrun") return isSelected ? "#FF8A3D" : "#FF8A3D";
  if (status === "resolved") return isSelected ? "#7CFFB2" : "#4AE593";
  return isSelected ? "#5B9DFF" : "#7FAFFF";
}

function SingleSectionPlane({ plane, isSelected }: SingleSectionPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const edgeRef = useRef<THREE.LineBasicMaterial>(null);

  const center = planeWorldPosition(plane);
  const rot = planeRotation(plane.normalAxis);
  const baseColor = statusColor(plane.status, isSelected);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (plane.status === "overrun" && matRef.current) {
      const pulse = 0.25 + 0.2 * Math.sin(t * 3);
      matRef.current.opacity = isSelected ? 0.45 + pulse : 0.25 + pulse * 0.7;
    } else if (matRef.current) {
      matRef.current.opacity = isSelected ? 0.38 : 0.2;
    }
    if (groupRef.current) {
      const bob = isSelected ? Math.sin(t * 1.6) * 0.12 : 0;
      groupRef.current.position.y = center[1] + bob;
    }
    if (edgeRef.current) {
      edgeRef.current.opacity = isSelected ? 1 : 0.75;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useGameStore.getState().selectPlane(plane.id);
    useGameStore.getState().setCameraFocus({
      position: [center[0] + 25, center[1] + 18, center[2] + 28],
      target: center,
    });
  };

  return (
    <group ref={groupRef} position={center} rotation={rot}>
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial
          ref={matRef}
          color={baseColor}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE)]} />
        <lineBasicMaterial
          ref={edgeRef}
          color={baseColor}
          transparent
          opacity={0.85}
        />
      </lineSegments>

      <mesh position={[0, 0, 0.05]}>
        <ringGeometry args={[1.4, 1.7, 64]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>

      {plane.status === "overrun" && (
        <mesh position={[0, 0, 0.1]} rotation={[0, 0, 0]}>
          <torusGeometry args={[2.5, 0.05, 16, 100]} />
          <meshBasicMaterial color="#FF6B1A" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

export default function SectionPlaneMesh() {
  const planes = useDataStore((s) => s.planes);
  const activeDatasetId = useDataStore((s) => s.activeDatasetId);
  const selectedPlaneId = useGameStore((s) => s.selectedPlaneId);

  const visible = useMemo(
    () => planes.filter((p) => !activeDatasetId || p.datasetId === activeDatasetId),
    [planes, activeDatasetId],
  );

  return (
    <group>
      {visible.map((p) => (
        <SingleSectionPlane
          key={p.id}
          plane={p}
          isSelected={selectedPlaneId === p.id}
        />
      ))}
    </group>
  );
}
