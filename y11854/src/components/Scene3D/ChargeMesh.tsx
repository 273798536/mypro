import { useRef, useMemo, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Sphere, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

interface ChargeMeshProps {
  id: string;
  position: [number, number, number];
  magnitude: number;
  label: string;
  isSelected: boolean;
}

export function ChargeMesh({ id, position, magnitude, label, isSelected }: ChargeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectCharge, updateChargePosition } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const intersectionRef = useRef(new THREE.Vector3());

  const color = useMemo(() => {
    if (magnitude > 0) return '#ff3b5c';
    if (magnitude < 0) return '#3b7dff';
    return '#888888';
  }, [magnitude]);

  const emissiveIntensity = isSelected ? 0.8 : 0.4;

  const sphereRadius = useMemo(() => {
    return 0.2 + Math.min(Math.abs(magnitude) * 0.1, 0.3);
  }, [magnitude]);

  const getWorldPosition = useCallback((event: any) => {
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeRef.current, target);
    return target;
  }, [camera, gl]);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    selectCharge(id);
    setIsDragging(true);
    gl.domElement.style.cursor = 'grabbing';
    gl.domElement.setPointerCapture(e.pointerId);
  }, [id, selectCharge, gl]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging) return;
    e.stopPropagation();
    const worldPos = getWorldPosition(e);
    if (worldPos) {
      const newPos: [number, number, number] = [
        Math.round(worldPos.x * 20) / 20,
        Math.round(worldPos.y * 20) / 20,
        0,
      ];
      updateChargePosition(id, newPos);
    }
  }, [id, isDragging, updateChargePosition, getWorldPosition]);

  const handlePointerUp = useCallback((e: any) => {
    if (isDragging) {
      setIsDragging(false);
      gl.domElement.style.cursor = 'auto';
      try { gl.domElement.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [isDragging, gl]);

  const signLabel = magnitude > 0 ? '+' : magnitude < 0 ? '−' : '';

  return (
    <group
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Sphere ref={meshRef} args={[sphereRadius, 32, 32]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.9}
        />
      </Sphere>

      <Text
        position={[0, 0, sphereRadius + 0.05]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {signLabel}
      </Text>

      <Html position={[0, sphereRadius + 0.35, 0]} center distanceFactor={8}>
        <div className={`px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap
          ${isSelected ? 'bg-white/20 border border-white/40' : 'bg-black/50'}
          text-white backdrop-blur-sm pointer-events-none`}>
          {label} ({magnitude > 0 ? '+' : ''}{magnitude.toFixed(1)})
        </div>
      </Html>

      {isSelected && (
        <Sphere args={[sphereRadius + 0.08, 32, 32]}>
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
        </Sphere>
      )}

      <Html position={[0, -(sphereRadius + 0.25), 0]} center distanceFactor={10}>
        <div className="text-[10px] font-mono text-cyan-300/70 whitespace-nowrap pointer-events-none">
          ({position[0].toFixed(1)}, {position[1].toFixed(1)}, {position[2].toFixed(1)})
        </div>
      </Html>
    </group>
  );
}
