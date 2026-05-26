import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Terrain from "./Terrain";
import Route, { RouteInteractor, OrbitControls } from "./Route";
import Samples from "./Samples";
import CommWindows from "./CommWindows";
import Rover from "./Rover";
import { useMoonStore } from "@/store/moon";

function Stars() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < 1200; i++) {
      const r = 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.05);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      positions.push(x, y, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return g;
  }, []);

  return (
    <points geometry={geom}>
      <pointsMaterial size={0.4} color={0xcfe3ff} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function SunLight() {
  const sun = useMoonStore((s) => s.sun);
  const angle = (sun.angle * Math.PI) / 180;
  const dist = 60;
  const x = Math.cos(angle) * dist;
  const z = Math.sin(angle) * dist;
  const y = 40;

  return (
    <>
      <directionalLight
        position={[x, y, z]}
        intensity={sun.intensity * 1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0005}
        color={0xfff1d8}
      />
      <ambientLight intensity={0.25} color={0x3a4a5e} />
      <hemisphereLight args={[0x8fbfff, 0x1a1a2a, 0.25]} />
      <mesh position={[x, y, z]}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color={0xffe9a8} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 30, 30], fov: 50, near: 0.1, far: 400 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[0x06080e]} />
      <fog attach="fog" args={[0x06080e, 60, 160]} />
      <Stars />
      <SunLight />
      <OrbitControls />
      <Terrain />
      <Route />
      <Samples />
      <CommWindows />
      <Rover />
      <RouteInteractor />
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.2}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
