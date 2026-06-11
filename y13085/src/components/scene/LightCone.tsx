import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh } from "three";

interface LightConeProps {
  position: [number, number, number];
  intensity: number;
  colorTemp: number;
  isSelected: boolean;
  isFiltered: boolean;
  onClick: () => void;
}

function colorTempToRGB(kelvin: number): string {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(Math.max(temp, 1)) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(Math.max(temp - 10, 1)) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(Math.max(temp - 60, 1), -0.1332047592);
    g = 288.1221695283 * Math.pow(Math.max(temp - 60, 1), -0.0755148492);
    b = 255;
  }

  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));

  return `rgb(${r}, ${g}, ${b})`;
}

export default function LightCone({
  position,
  intensity,
  colorTemp,
  isSelected,
  isFiltered,
  onClick,
}: LightConeProps) {
  const glowRef = useRef<Mesh>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const targetObjRef = useRef<THREE.Object3D>(null);

  const color = useMemo(() => colorTempToRGB(colorTemp), [colorTemp]);
  const opacity = isFiltered ? 0.05 : Math.min(0.32, intensity * 0.38);

  useFrame(() => {
    if (glowRef.current && isSelected) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = opacity + Math.sin(Date.now() * 0.004) * 0.04;
    }
    if (spotLightRef.current && targetObjRef.current) {
      spotLightRef.current.target = targetObjRef.current;
    }
  });

  return (
    <group position={position}>
      <object3D ref={targetObjRef} position={[0, -3, 0]} />

      <mesh
        ref={glowRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        position={[0, -1.3, 0]}
        rotation={[Math.PI, 0, 0]}
      >
        <coneGeometry args={[0.9, 2.6, 18, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, -1.3, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.94, 2.64, 18, 1, true]} />
          <meshBasicMaterial
            color="#C9956B"
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      <spotLight
        ref={spotLightRef}
        color={color}
        intensity={intensity * 45}
        angle={0.35}
        penumbra={0.55}
        distance={5.5}
        decay={1.6}
        position={[0, 0, 0]}
      />

      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh
        position={[0, 0.08, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <cylinderGeometry args={[0.1, 0.07, 0.14, 10]} />
        <meshStandardMaterial
          color={isSelected ? "#C9956B" : "#2A2A44"}
          metalness={isSelected ? 0.7 : 0.3}
          roughness={0.4}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.13, 0.1, 0.17, 10]} />
          <meshBasicMaterial color="#C9956B" transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  );
}
