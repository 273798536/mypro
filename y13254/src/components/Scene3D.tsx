import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { useStore } from "../store";
import type { Location, NoticeItem } from "../shared/types";

function getStatusColor(status: NoticeItem["status"]): string {
  switch (status) {
    case "approved":
      return "#059669";
    case "need_supplement":
      return "#DC2626";
    case "pending_manual":
      return "#7C3AED";
    case "pending_review":
      return "#D97706";
    case "community_verified":
      return "#0891B2";
    default:
      return "#D97706";
  }
}

function lngLatToXYZ(lng: number, lat: number): [number, number, number] {
  const x = lng * 10000 - 1164000;
  const z = lat * 10000 - 399100;
  return [x, 0, z];
}

interface StallProps {
  location: Location;
  item: NoticeItem | undefined;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function Stall({ location, item, isSelected, isHovered, onSelect, onHover }: StallProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseColor = item ? getStatusColor(item.status) : "#D97706";
  const position = lngLatToXYZ(location.lng, location.lat);

  useFrame((state) => {
    if (!groupRef.current) return;
    const targetScale = isHovered ? 1.08 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1,
    );
    if (isSelected) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.15;
    } else {
      groupRef.current.position.y = position[1];
    }
  });

  const outlineScale = 1.08;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(location.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(location.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.3, 6]} />
        <meshStandardMaterial color={baseColor} transparent opacity={0.9} roughness={0.7} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[6 * outlineScale, 0.35, 6 * outlineScale]} />
          <meshBasicMaterial color="#FF6B35" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {[[-2.5, 0, -2.5], [2.5, 0, -2.5], [-2.5, 0, 2.5], [2.5, 0, 2.5]].map((pos, i) => (
        <mesh key={i} position={[pos[0], 1.8, pos[2]]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
          <meshStandardMaterial color="#FFE66D" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}

      <mesh position={[0, 3.5, 0]} castShadow>
        <boxGeometry args={[6.5, 0.15, 6.5]} />
        <meshStandardMaterial color="#FFE66D" metalness={0.2} roughness={0.6} />
      </mesh>

      <pointLight color="#FF8C60" intensity={1.2} distance={10} position={[0, 3.5, 0]} />

      {(isHovered || isSelected) && (
        <Html position={[0, 5.5, 0]} center distanceFactor={12}>
          <div className="bg-night-500/95 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg pointer-events-none font-medium">
            {location.canonicalName}
          </div>
        </Html>
      )}
    </group>
  );
}

function Buildings() {
  const buildings = useMemo(() => {
    const arr: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    const seed = 42;
    let rand = seed;
    const pseudoRandom = () => {
      rand = (rand * 9301 + 49297) % 233280;
      return rand / 233280;
    };
    for (let i = 0; i < 20; i++) {
      const side = pseudoRandom() > 0.5 ? 1 : -1;
      const w = 8 + pseudoRandom() * 17;
      const d = 8 + pseudoRandom() * 17;
      const h = 12 + pseudoRandom() * 28;
      const x = (pseudoRandom() - 0.5) * 360;
      const z = side * (60 + pseudoRandom() * 80) + (pseudoRandom() - 0.5) * 40;
      arr.push({ pos: [x, h / 2, z], size: [w, h, d] });
    }
    return arr;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#1a2f4b" metalness={0.2} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function CameraFly() {
  const { camera } = useThree();
  const selectedLocationId = useStore((s) => s.selectedLocationId);
  const locations = useStore((s) => s.locations);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedLocationId) return;
    const location = locations.find((l) => l.id === selectedLocationId);
    if (!location) return;

    const [tx, , tz] = lngLatToXYZ(location.lng, location.lat);
    const targetPos = new THREE.Vector3(tx + 25, 22, tz + 25);
    const startPos = camera.position.clone();

    let progress = 0;
    const animate = () => {
      progress = Math.min(progress + 0.025, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.position.lerpVectors(startPos, targetPos, eased);
      camera.lookAt(tx, 2, tz);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [selectedLocationId, locations, camera]);

  return null;
}

function SceneContent() {
  const locations = useStore((s) => s.locations);
  const items = useStore((s) => s.items);
  const selectedLocationId = useStore((s) => s.selectedLocationId);
  const hoveredLocationId = useStore((s) => s.hoveredLocationId);
  const setSelectedLocationId = useStore((s) => s.setSelectedLocationId);
  const setHoveredLocationId = useStore((s) => s.setHoveredLocationId);

  return (
    <>
      <color attach="background" args={["#0B1A2B"]} />
      <fog attach="fog" args={["#0B1A2B", 200, 500]} />

      <ambientLight intensity={0.35} color="#9CB4D0" />
      <directionalLight
        position={[-30, 50, 20]}
        intensity={0.3}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <hemisphereLight args={["#6B8DB0", "#0B1A2B", 0.3]} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[400, 300]} />
        <meshStandardMaterial color="#10243F" roughness={1} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <planeGeometry args={[400, 20]} />
        <meshStandardMaterial color="#1a3555" roughness={1} />
      </mesh>

      <Buildings />

      {locations.map((loc) => {
        const item = items.find((i) => i.locationId === loc.id);
        return (
          <Stall
            key={loc.id}
            location={loc}
            item={item}
            isSelected={selectedLocationId === loc.id}
            isHovered={hoveredLocationId === loc.id}
            onSelect={setSelectedLocationId}
            onHover={setHoveredLocationId}
          />
        );
      })}

      <CameraFly />
      <OrbitControls enablePan makeDefault target={[0, 2, 0]} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} intensity={0.7} radius={0.6} />
      </EffectComposer>
    </>
  );
}

export default function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [60, 55, 60], fov: 50 }}>
        <SceneContent />
      </Canvas>
    </div>
  );
}
