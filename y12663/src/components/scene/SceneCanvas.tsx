import { useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import BuildingBlocksMesh from "./BuildingBlocksMesh";
import SectionPlaneMesh from "./SectionPlaneMesh";
import { useGameStore } from "@/store/gameStore";

interface CameraMoverProps {
  focus: { position: [number, number, number]; target: [number, number, number] } | null;
}

function CameraMover({ focus }: CameraMoverProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const targetPos = useRef(new THREE.Vector3(55, 50, 70));
  const targetLook = useRef(new THREE.Vector3(0, 5, 0));

  useEffect(() => {
    if (focus) {
      targetPos.current.set(...focus.position);
      targetLook.current.set(...focus.target);
    }
  }, [focus]);

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, Math.min(1, delta * 2.2));
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, Math.min(1, delta * 2.2));
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={12}
      maxDistance={200}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}

interface SceneCanvasProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export default function SceneCanvas({ canvasRef }: SceneCanvasProps) {
  const cameraFocus = useGameStore((s) => s.cameraFocus);

  return (
    <Canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      camera={{ position: [55, 50, 70], fov: 45, near: 0.1, far: 500 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#07162e"]} />
      <fog attach="fog" args={["#07162e", 90, 240]} />

      <ambientLight intensity={0.35} color="#8bb4ff" />
      <directionalLight
        position={[45, 60, 30]}
        intensity={1.35}
        color="#fff2d6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-30, 25, -20]} intensity={0.35} color="#6fa3ff" />

      <Grid
        position={[0, -0.02, 0]}
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#1d3c70"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#3d7eeb"
        fadeDistance={160}
        fadeStrength={1.2}
        infiniteGrid
      />

      <BuildingBlocksMesh />
      <SectionPlaneMesh />

      <CameraMover focus={cameraFocus} />
      <Environment preset="night" />

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.18}
          luminanceSmoothing={0.35}
          intensity={0.85}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </Canvas>
  );
}
