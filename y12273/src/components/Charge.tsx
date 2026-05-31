import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFieldStore } from "@/store/fieldStore";

export default function Charge({ id, position, charge }: { id: string; position: [number, number, number]; charge: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const selectCharge = useFieldStore((s) => s.selectCharge);
  const selectedChargeId = useFieldStore((s) => s.selectedChargeId);
  const updateChargePosition = useFieldStore((s) => s.updateChargePosition);
  const pushHistory = useFieldStore((s) => s.pushHistory);
  const isPaused = useFieldStore((s) => s.isPaused);
  const isSelected = selectedChargeId === id;

  const color = charge > 0 ? "#ff4757" : "#1e90ff";
  const glowColor = charge > 0 ? "#ff6b81" : "#70a1ff";

  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (glowRef.current) {
      const scale = 1 + 0.08 * Math.sin(Date.now() * 0.003);
      glowRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation?.();
    selectCharge(id);
  };

  const handlePointerDown = (e: any) => {
    if (isPaused) return;
    e.stopPropagation();
    isDragging.current = true;
    selectCharge(id);
    const mesh = meshRef.current;
    if (!mesh) return;
    const planeIntersect = new THREE.Vector3();
    const raycaster = (e as any).ray as THREE.Ray;
    raycaster.intersectPlane(dragPlane.current, planeIntersect);
    if (planeIntersect) {
      dragOffset.current.copy(planeIntersect).sub(mesh.position);
    }
    (e.target as any).setPointerCapture?.((e as any).pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || isPaused) return;
    e.stopPropagation();
    const raycaster = (e as any).ray as THREE.Ray;
    const planeIntersect = new THREE.Vector3();
    raycaster.intersectPlane(dragPlane.current, planeIntersect);
    if (planeIntersect) {
      const newPos = planeIntersect.sub(dragOffset.current);
      const clamped: [number, number, number] = [
        Math.max(-8, Math.min(8, newPos.x)),
        0,
        Math.max(-8, Math.min(8, newPos.z)),
      ];
      updateChargePosition(id, clamped);
    }
  };

  const handlePointerUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      pushHistory("拖动电荷");
    }
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.15}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color="#00f5d4" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      <pointLight color={color} intensity={2} distance={5} decay={2} />
    </group>
  );
}
