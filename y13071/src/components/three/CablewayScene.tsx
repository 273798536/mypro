import { useMemo, useRef } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, Effects } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Terrain } from "./Terrain";
import { StationMesh } from "./StationMesh";
import { TowerMesh } from "./TowerMesh";
import { CarMesh } from "./CarMesh";
import { CableLine } from "./CableLine";
import { AnomalyPulse } from "./AnomalyPulse";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useFilterStore } from "@/stores/filterStore";
import { timestampStates } from "@/utils/mockData";
import type { CablewayObject, ObjectStatus } from "@/shared/types";
import { useCameraSync } from "@/hooks/useCameraSync";

function lookupStatus(objectId: string, ts: number): ObjectStatus {
  const states = timestampStates.filter((s) => s.objectId === objectId);
  if (states.length === 0) return "NORMAL";
  states.sort((a, b) => a.timestamp - b.timestamp);
  let found = states[0];
  for (const s of states) {
    if (s.timestamp <= ts) found = s;
    else break;
  }
  return found.status;
}

function SceneInner({
  cameraSync,
}: {
  cameraSync: ReturnType<typeof useCameraSync>;
}) {
  const { objects, selectedObjectId, selectObject, isObjectVisible } =
    useFilterStore();
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp);
  const duration = usePlaybackStore((s) => s.duration);
  const tick = usePlaybackStore((s) => s.tick);
  const rafRef = useRef(0);

  useFrame((_, delta) => {
    tick(delta);
  });

  const statusMap = useMemo(() => {
    const m = new Map<string, ObjectStatus>();
    objects.forEach((o) => m.set(o.id, lookupStatus(o.id, currentTimestamp)));
    return m;
  }, [objects, currentTimestamp]);

  const anomalyActive = useMemo(() => {
    const anomalies = useFilterStore.getState().anomalies;
    return new Set(
      anomalies
        .filter(
          (a) =>
            Math.abs(a.timestamp - currentTimestamp) < 240 &&
            a.resolved !== "RESOLVED"
        )
        .map((a) => a.objectId)
    );
  }, [currentTimestamp]);

  const handleClick = (obj: CablewayObject) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectObject(obj.id);
  };

  return (
    <>
      <OrbitControls
        ref={cameraSync.controlsRef as any}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={6}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
      />
      <ambientLight intensity={0.35} color="#6680a3" />
      <directionalLight
        position={[18, 26, 10]}
        intensity={0.55}
        color="#ffe0b0"
        castShadow
      />
      <pointLight position={[0, 8, -14]} intensity={1.1} color="#ff8a5e" distance={50} />
      <pointLight position={[-18, 8, -10]} intensity={0.6} color="#9fb3c8" distance={30} />
      <pointLight position={[18, 7, -8]} intensity={0.6} color="#9fb3c8" distance={30} />
      <fog attach="fog" args={["#050e1e", 30, 95]} />
      <color attach="background" args={["#050e1e"]} />

      <Terrain />

      {objects.map((obj) => {
        const status = statusMap.get(obj.id) || "NORMAL";
        const selected = selectedObjectId === obj.id;
        const visible = isObjectVisible(obj, status);
        const progress =
          obj.type === "CAR" ? (currentTimestamp % duration) / duration : 0;
        const anomalyPos: [number, number, number] = [
          obj.position[0],
          obj.position[1] + (obj.type === "STATION" ? 5 : obj.type === "TOWER" ? 12 : 2),
          obj.position[2],
        ];
        return (
          <group key={obj.id}>
            {obj.type === "STATION" && (
              <StationMesh
                object={obj}
                status={status}
                selected={selected}
                visible={visible}
                onClick={handleClick(obj)}
              />
            )}
            {obj.type === "TOWER" && (
              <TowerMesh
                object={obj}
                status={status}
                selected={selected}
                visible={visible}
                onClick={handleClick(obj)}
              />
            )}
            {obj.type === "CAR" && (
              <CarMesh
                object={obj}
                status={status}
                selected={selected}
                visible={visible}
                progress={progress + (objects.indexOf(obj) % 3) * 0.33}
                onClick={handleClick(obj)}
              />
            )}
            {obj.type === "CABLE" && (
              <CableLine object={obj} status={status} visible={visible} />
            )}
            {anomalyActive.has(obj.id) && (
              <AnomalyPulse
                position={anomalyPos}
                status={status === "NORMAL" ? "ERROR" : status}
                visible={visible}
              />
            )}
          </group>
        );
      })}

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export function CablewayScene({
  cameraSync,
}: {
  cameraSync: ReturnType<typeof useCameraSync>;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [25, 22, 28], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => useFilterStore.getState().selectObject(null)}
    >
      <SceneInner cameraSync={cameraSync} />
    </Canvas>
  );
}
