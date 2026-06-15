import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useAppStore } from "@/store/useAppStore";
import { ComplaintPointMesh } from "./ComplaintPointMesh";
import { CityBuildings } from "./CityBuildings";
import { RoadNetwork } from "./RoadNetwork";

const CENTER_LNG = 116.337;
const CENTER_LAT = 39.986;
const SCALE = 200;

function lngLatToXYZ(lng: number, lat: number): [number, number, number] {
  const x = (lng - CENTER_LNG) * SCALE;
  const z = (CENTER_LAT - lat) * SCALE;
  return [x, 0, z];
}

function CameraController() {
  const { camera } = useThree();
  const focusPosition = useAppStore((s) => s.focusPosition);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (focusPosition) {
      targetRef.current.set(focusPosition[0], focusPosition[1] + 2, focusPosition[2] + 3);
      currentTarget.current.lerp(targetRef.current, 0.05);
      camera.position.lerp(currentTarget.current, 0.04);
    }
  });

  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[16, 16, 1, 1]} />
      <meshStandardMaterial
        color="#050D20"
        roughness={0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

function GridHelperCustom() {
  const grid = useMemo(() => new THREE.GridHelper(16, 32, "#1A3F85", "#0B1E3F"), []);
  return <primitive object={grid} position={[0, 0.001, 0]} />;
}

function HeatmapOverlay() {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    gradient.addColorStop(0, "rgba(255, 140, 66, 0.12)");
    gradient.addColorStop(0.4, "rgba(46, 90, 174, 0.08)");
    gradient.addColorStop(1, "rgba(11, 30, 63, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    return c;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [canvas]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial map={texture} transparent opacity={0.9} depthWrite={false} />
    </mesh>
  );
}

function PointsLayer() {
  const filteredPoints = useAppStore((s) => s.filteredPoints);
  const selectedPointId = useAppStore((s) => s.selectedPointId);
  const hoveredPointId = useAppStore((s) => s.hoveredPointId);
  const selectPoint = useAppStore((s) => s.selectPoint);
  const hoverPoint = useAppStore((s) => s.hoverPoint);
  const setFocusPosition = useAppStore((s) => s.setFocusPosition);

  return (
    <group>
      {filteredPoints.map((p) => {
        const [x, , z] = lngLatToXYZ(p.lng, p.lat);
        return (
          <ComplaintPointMesh
            key={p.id}
            point={p}
            x={x}
            z={z}
            isSelected={selectedPointId === p.id}
            isHovered={hoveredPointId === p.id}
            onClick={() => {
              selectPoint(p.id === selectedPointId ? null : p.id);
              if (p.id !== selectedPointId) {
                setFocusPosition([x, 0, z]);
              }
            }}
            onPointerOver={() => hoverPoint(p.id)}
            onPointerOut={() => hoverPoint(null)}
          />
        );
      })}
    </group>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.25} color="#5C82C6" />
      <directionalLight
        position={[6, 8, 4]}
        intensity={0.9}
        color="#FFCB8F"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.3} color="#2E5AAE" />
      <pointLight position={[0, 3, 0]} intensity={0.4} color="#FF8C42" distance={8} />
    </>
  );
}

export function Scene3D() {
  const setFocusPosition = useAppStore((s) => s.setFocusPosition);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 8], fov: 50 }}
      onPointerMissed={() => {
        useAppStore.getState().selectPoint(null);
        setFocusPosition(null);
      }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#020610"]} />
      <fog attach="fog" args={["#020610", 10, 22]} />
      <SceneLighting />
      <Environment preset="sunset" />
      <Stars radius={80} depth={40} count={1500} factor={3} fade speed={0.5} />

      <Ground />
      <HeatmapOverlay />
      <GridHelperCustom />
      <RoadNetwork />
      <CityBuildings />
      <PointsLayer />
      <CameraController />

      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={16}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={4}>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          mipmapBlur
          intensity={0.8}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
