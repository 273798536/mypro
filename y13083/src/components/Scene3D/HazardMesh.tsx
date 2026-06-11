import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HazardObject } from '@/types';

interface HazardMeshProps {
  obj: HazardObject;
  selected: boolean;
  hovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

export function HazardMesh({
  obj,
  selected,
  hovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: HazardMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  const baseColor = useMemo(() => {
    if (obj.source === 'cad_old') return '#6b7280';
    if (obj.source === 'verbal') return '#fbbf24';
    return obj.color;
  }, [obj.source, obj.color]);

  const opacity = useMemo(() => {
    if (obj.source === 'cad_old') return 0.4;
    if (obj.source === 'verbal') return 0.35;
    return 1;
  }, [obj.source]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);

    if (outlineRef.current && obj.isAbnormal) {
      const mat = outlineRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.4 + 0.6 * pulse;
    }
    if (wireframeRef.current && obj.isOverlapping) {
      const mat = wireframeRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + 0.7 * pulse;
    }
  });

  const setUserData = (mesh: THREE.Mesh | null) => {
    if (mesh) mesh.userData = { objectId: obj.id };
  };

  const renderGeometry = () => {
    const [sx, sy, sz] = obj.size;

    switch (obj.type) {
      case 'tank': {
        const radius = Math.min(sx, sz) / 2;
        const height = sy;
        return (
          <group>
            <mesh ref={setUserData} position={[0, -height / 2 + radius, 0]}>
              <cylinderGeometry args={[radius, radius, height - radius, 32]} />
              <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={opacity}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
            <mesh ref={setUserData} position={[0, height / 2, 0]}>
              <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={opacity}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
          </group>
        );
      }
      case 'pipe': {
        return (
          <mesh ref={setUserData}>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={opacity}
              roughness={0.5}
              metalness={0.4}
            />
          </mesh>
        );
      }
      case 'valve': {
        return (
          <group>
            <mesh ref={setUserData}>
              <boxGeometry args={[sx * 0.6, sy, sz * 0.6]} />
              <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={opacity}
                roughness={0.4}
                metalness={0.5}
              />
            </mesh>
            <mesh ref={setUserData} position={[0, sy * 0.7, 0]}>
              <sphereGeometry args={[Math.min(sx, sz) * 0.35, 24, 24]} />
              <meshStandardMaterial
                color={baseColor}
                transparent
                opacity={opacity}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
          </group>
        );
      }
      case 'storage':
      default: {
        return (
          <mesh ref={setUserData}>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={opacity}
              roughness={0.6}
              metalness={0.2}
            />
          </mesh>
        );
      }
    }
  };

  const bboxSize = useMemo(() => {
    const [sx, sy, sz] = obj.size;
    const maxDim = Math.max(sx, sy, sz);
    return new THREE.Vector3(maxDim * 1.15, maxDim * 1.15, maxDim * 1.15);
  }, [obj.size]);

  return (
    <group
      ref={groupRef}
      position={obj.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut();
      }}
    >
      {renderGeometry()}

      {obj.isAbnormal && (
        <>
          <lineSegments ref={outlineRef}>
            <edgesGeometry args={[new THREE.BoxGeometry(bboxSize.x, bboxSize.y, bboxSize.z)]} />
            <lineBasicMaterial color="#ef4444" transparent opacity={0.8} linewidth={2} />
          </lineSegments>
          <pointLight color="#ef4444" intensity={2} distance={8} decay={2} />
        </>
      )}

      {obj.isOverlapping && (
        <lineSegments ref={wireframeRef}>
          <edgesGeometry args={[new THREE.BoxGeometry(bboxSize.x * 0.95, bboxSize.y * 0.95, bboxSize.z * 0.95)]} />
          <lineBasicMaterial color="#eab308" transparent opacity={0.7} />
        </lineSegments>
      )}

      {obj.source === 'verbal' && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(bboxSize.x, bboxSize.y, bboxSize.z)]} />
          <lineDashedMaterial
            color="#fbbf24"
            dashSize={0.15}
            gapSize={0.1}
            transparent
            opacity={0.9}
          />
        </lineSegments>
      )}

      {selected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(bboxSize.x * 1.05, bboxSize.y * 1.05, bboxSize.z * 1.05)]} />
          <lineBasicMaterial color="#ffffff" linewidth={3} />
        </lineSegments>
      )}

      {hovered && !selected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(bboxSize.x * 1.02, bboxSize.y * 1.02, bboxSize.z * 1.02)]} />
          <lineBasicMaterial color="#60a5fa" transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );
}
