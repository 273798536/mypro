import React, { useRef } from "react";
import { Sphere, Html, Torus } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { NoiseSource } from "@/types";
import { SOURCE_TYPE_COLORS } from "@/types";

interface SoundField3DProps {
  sources: NoiseSource[];
  enabledTypes: Set<string>;
  currentHour: number;
}

function NoiseSourceSphere({ source, color }: { source: NoiseSource; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.15);
    }
  });

  return (
    <group position={[source.position[0], source.position[1], source.position[2]]}>
      <Sphere ref={meshRef} args={[0.8, 16, 16]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </Sphere>
      <pointLight color={color} intensity={3} distance={20} decay={2} />
      <Html center distanceFactor={40} style={{ pointerEvents: "none" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.75)",
            color: "white",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            whiteSpace: "nowrap",
            border: `1px solid ${color}`,
          }}
        >
          {source.name}
        </div>
      </Html>
    </group>
  );
}

function Ripple({ position, color, baseLevel }: { position: [number, number, number]; color: string; baseLevel: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const maxRadius = baseLevel * 0.6;
  const rippleCount = 3;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[position[0], 0.05, position[2]]}>
      {Array.from({ length: rippleCount }, (_, i) => {
        const phase = i / rippleCount;
        const radius = maxRadius * (0.3 + phase * 0.7);
        return (
          <Torus
            key={i}
            args={[radius, 0.08, 8, 64]}
            rotation={[-Math.PI / 2, 0, (phase * Math.PI * 2) / rippleCount]}
          >
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.35 - i * 0.08}
              emissive={color}
              emissiveIntensity={0.5}
            />
          </Torus>
        );
      })}
    </group>
  );
}

function SoundField3D({ sources, enabledTypes, currentHour }: SoundField3DProps) {
  const activeSources = sources.filter((s) => {
    if (!enabledTypes.has(s.type)) return false;
    return s.timeRanges.some(
      (tr) => currentHour >= tr.startHour && currentHour < tr.endHour
    );
  });

  return (
    <group>
      {activeSources.map((source) => {
        const color = SOURCE_TYPE_COLORS[source.type] || "#ffffff";
        return (
          <React.Fragment key={source.id}>
            <NoiseSourceSphere source={source} color={color} />
            <Ripple
              position={source.position}
              color={color}
              baseLevel={source.baseLevel}
            />
          </React.Fragment>
        );
      })}
    </group>
  );
}

export default React.memo(SoundField3D);
