import { useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useSceneStore } from "../../hooks/useSceneStore";
import ShowcaseModel from "./ShowcaseModel";
import LightCone from "./LightCone";
import ObjectHighlight from "./ObjectHighlight";
import * as THREE from "three";

const SHOWCASE_POSITIONS: Record<string, [number, number, number]> = {
  "sc-001": [-3.5, 0, 0],
  "sc-002": [0, 0, 0],
  "sc-003": [3.5, 0, 0],
};

export default function ShowcaseScene() {
  const {
    selectedObjectId,
    setSelectedObjectId,
    filterState,
    lightObjects,
    showcases,
  } = useSceneStore();

  const isObjectFiltered = useCallback(
    (objectId: string) => {
      const light = lightObjects.find((l) => l.id === objectId);
      if (!light) return false;
      const showcase = showcases.find((s) => s.id === light.showcaseId);
      if (!showcase) return false;

      if (filterState.objectType && light.type !== filterState.objectType) return true;
      if (filterState.zone && showcase.zone !== filterState.zone) return true;

      return false;
    },
    [filterState, lightObjects, showcases]
  );

  const isShowcaseSelected = useCallback(
    (showcaseId: string) => {
      if (!selectedObjectId) return false;
      const light = lightObjects.find((l) => l.id === selectedObjectId);
      return light?.showcaseId === showcaseId;
    },
    [selectedObjectId, lightObjects]
  );

  const isShowcaseFiltered = useCallback(
    (showcaseId: string) => {
      const showcaseLights = lightObjects.filter((l) => l.showcaseId === showcaseId);
      if (!filterState.objectType && !filterState.zone) return false;
      return showcaseLights.every((l) => isObjectFiltered(l.id));
    },
    [filterState, lightObjects, isObjectFiltered]
  );

  const sceneLights = lightObjects.filter((l) => !isObjectFiltered(l.id));

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: "100%", height: "100%", background: "#0A0A14" }}
      onPointerMissed={() => setSelectedObjectId(null)}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[0, 5, 9]} fov={50} />
      <OrbitControls
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={4}
        maxDistance={18}
        enableDamping
        dampingFactor={0.06}
      />

      <ambientLight color="#E8D5C0" intensity={0.35} />
      <directionalLight color="#F5E6D3" intensity={0.4} position={[5, 10, 8]} />

      {showcases.map((showcase) => (
        <ShowcaseModel
          key={showcase.id}
          position={SHOWCASE_POSITIONS[showcase.id] || [0, 0, 0]}
          isSelected={isShowcaseSelected(showcase.id)}
          isFiltered={isShowcaseFiltered(showcase.id)}
          onClick={() => {
            const firstLight = lightObjects.find((l) => l.showcaseId === showcase.id);
            if (firstLight) setSelectedObjectId(firstLight.id);
          }}
        />
      ))}

      {sceneLights.map((light) => {
        const showcasePos = SHOWCASE_POSITIONS[light.showcaseId] || [0, 0, 0];
        const adjustedPos: [number, number, number] = [
          light.position[0] + showcasePos[0],
          light.position[1] + showcasePos[1] + 1.2,
          light.position[2] + showcasePos[2],
        ];
        return (
          <group key={light.id}>
            <LightCone
              position={adjustedPos}
              intensity={light.intensity}
              colorTemp={light.colorTemp}
              isSelected={selectedObjectId === light.id}
              isFiltered={false}
              onClick={() => setSelectedObjectId(light.id)}
            />
            {selectedObjectId === light.id && (
              <ObjectHighlight
                position={[adjustedPos[0], adjustedPos[1] - 2.9, adjustedPos[2]]}
                visible={true}
              />
            )}
          </group>
        );
      })}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#10101C" roughness={0.95} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.44, 0]}>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial
          color="#181828"
          roughness={0.85}
          metalness={0.08}
          emissive="#0A0A14"
          emissiveIntensity={0.15}
        />
      </mesh>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.5}
          mipmapBlur
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.15} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
