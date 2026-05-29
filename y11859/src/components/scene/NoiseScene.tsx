import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane, Grid } from "@react-three/drei";
import { useNoiseStore } from "@/store/useNoiseStore";
import Building3D from "./Building3D";
import SoundField3D from "./SoundField3D";

function SceneContent() {
  const buildings = useNoiseStore((s) => s.buildings);
  const noiseSources = useNoiseStore((s) => s.noiseSources);
  const selectedBuildingId = useNoiseStore((s) => s.selectedBuildingId);
  const selectedFloor = useNoiseStore((s) => s.selectedFloor);
  const currentHour = useNoiseStore((s) => s.currentHour);
  const enabledTypes = useNoiseStore((s) => s.enabledTypes);
  const floorNoiseMap = useNoiseStore((s) => s.floorNoiseMap);
  const selectBuilding = useNoiseStore((s) => s.selectBuilding);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight intensity={0.8} position={[50, 80, 50]} />

      <fog attach="fog" args={["#0d1117", 80, 200]} />

      <OrbitControls
        maxPolarAngle={Math.PI / 2.1}
        maxDistance={200}
        minDistance={20}
      />

      <Plane
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        args={[200, 200]}
      >
        <meshStandardMaterial color="#1a1f2e" />
      </Plane>

      <Grid
        position={[0, 0.01, 0]}
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#2a2f3e"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#3a3f4e"
        fadeDistance={150}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {buildings.map((building) => {
        const isSelected = selectedBuildingId === building.id;
        const floorNoises = floorNoiseMap.get(building.id) || [];
        return (
          <Building3D
            key={building.id}
            building={building}
            isSelected={isSelected}
            selectedFloor={selectedFloor}
            floorNoises={floorNoises}
            onClick={() => selectBuilding(building.id)}
          />
        );
      })}

      <SoundField3D
        sources={noiseSources}
        enabledTypes={enabledTypes}
        currentHour={currentHour}
      />
    </>
  );
}

function NoiseScene() {
  return (
    <Canvas
      camera={{ position: [60, 50, 60], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <SceneContent />
    </Canvas>
  );
}

export default React.memo(NoiseScene);
