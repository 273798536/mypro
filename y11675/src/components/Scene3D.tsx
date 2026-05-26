import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { ChargeMesh } from './ChargeMesh';
import { FieldLines } from './FieldLines';
import { EquipotentialSurfaces } from './EquipotentialSurfaces';
import { Vec3, Warning } from '@/types';
import { checkOverlap, checkDivergence, calculateFieldAtPoint } from '@/utils/physics';

interface SceneProps {
  onPointSelect: (point: Vec3 | null) => void;
}

function DraggableCharge({
  charge,
  isSelected,
  onDragEnd
}: {
  charge: ReturnType<typeof useStore.getState>['charges'][0];
  isSelected: boolean;
  onDragEnd: (id: string, position: Vec3) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  const { camera, gl } = useThree();

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const normal = new THREE.Vector3(0, 1, 0);
    normal.transformDirection(camera.matrixWorld).normalize();
    dragPlane.current.setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(charge.position.x, charge.position.y, charge.position.z)
    );

    const intersectPoint = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX || e.clientX === 0 ? e.clientX : 0) - rect.left) / rect.width * 2 - 1;
    mouse.y = -((e.clientY || e.clientY === 0 ? e.clientY : 0) - rect.top) / rect.height * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane.current, intersectPoint);
    dragOffset.current.copy(intersectPoint).sub(new THREE.Vector3(charge.position.x, charge.position.y, charge.position.z));
  }, [camera, gl, charge.position]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging || !meshRef.current) return;
    e.stopPropagation();

    const intersectPoint = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX || e.clientX === 0 ? e.clientX : 0) - rect.left) / rect.width * 2 - 1;
    mouse.y = -((e.clientY || e.clientY === 0 ? e.clientY : 0) - rect.top) / rect.height * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(dragPlane.current, intersectPoint);

    const newPos = intersectPoint.sub(dragOffset.current);
    meshRef.current.position.copy(newPos);
  }, [isDragging, camera, gl]);

  const handlePointerUp = useCallback((e: any) => {
    if (!isDragging || !meshRef.current) return;
    e.stopPropagation();
    setIsDragging(false);
    onDragEnd(charge.id, {
      x: meshRef.current.position.x,
      y: meshRef.current.position.y,
      z: meshRef.current.position.z
    });
  }, [isDragging, charge.id, onDragEnd]);

  return (
    <group
      ref={meshRef}
      position={[charge.position.x, charge.position.y, charge.position.z]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <mesh>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={charge.color}
          emissive={charge.color}
          emissiveIntensity={isSelected ? 0.8 : 0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial
          color={charge.color}
          transparent
          opacity={isSelected ? 0.3 : 0.15}
        />
      </mesh>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function SceneContent({ onPointSelect }: SceneProps) {
  const {
    charges,
    showFieldLines,
    showEquipotential,
    selectedChargeId,
    selectCharge,
    updateChargePosition,
    addWarning,
    clearWarnings,
    selectedSamplePoint,
    setSelectedSamplePoint
  } = useStore();

  const [hoveredPoint, setHoveredPoint] = useState<Vec3 | null>(null);
  const { camera, gl } = useThree();

  useEffect(() => {
    clearWarnings();
    const overlapWarnings = checkOverlap(charges);
    const samplePoints = charges.map(c => ({
      x: c.position.x + 0.5,
      y: c.position.y + 0.5,
      z: c.position.z + 0.5
    }));
    const divergenceWarnings = checkDivergence(charges, samplePoints);

    [...overlapWarnings, ...divergenceWarnings].forEach(w => addWarning(w));
  }, [charges, addWarning, clearWarnings]);

  const handlePointerMissed = useCallback((e: any) => {
    if (e.button === 2) {
      const mouse = new THREE.Vector2();
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX || e.clientX === 0 ? e.clientX : 0) - rect.left) / rect.width * 2 - 1;
      mouse.y = -((e.clientY || e.clientY === 0 ? e.clientY : 0) - rect.top) / rect.height * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      
      setSelectedSamplePoint({
        x: intersectPoint.x,
        y: 0,
        z: intersectPoint.z
      });
    } else {
      selectCharge(null);
      setSelectedSamplePoint(null);
    }
  }, [camera, gl, selectCharge, setSelectedSamplePoint]);

  const handleDragEnd = useCallback((id: string, position: Vec3) => {
    updateChargePosition(id, position);
  }, [updateChargePosition]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellColor="#334155"
        sectionColor="#475569"
        sectionSize={5}
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid
      />

      <group onPointerMissed={handlePointerMissed}>
        {charges.map(charge => (
          <DraggableCharge
            key={charge.id}
            charge={charge}
            isSelected={selectedChargeId === charge.id}
            onDragEnd={handleDragEnd}
          />
        ))}
      </group>

      {showFieldLines && <FieldLines charges={charges} />}

      {showEquipotential && <EquipotentialSurfaces charges={charges} />}

      {selectedSamplePoint && (
        <group position={[selectedSamplePoint.x, selectedSamplePoint.y, selectedSamplePoint.z]}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
          </mesh>
        </group>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}

interface Scene3DProps {
  onPointSelect: (point: Vec3 | null) => void;
}

export function Scene3D({ onPointSelect }: Scene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 60 }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1e3a5f 100%)' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <fog attach="fog" args={['#0a1628', 10, 30]} />
      <SceneContent onPointSelect={onPointSelect} />
    </Canvas>
  );
}
