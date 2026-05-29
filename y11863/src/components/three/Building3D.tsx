import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { BuildingModel, MeterData, EnergyType, CameraState } from '../../types';
import { Floor3D } from './Floor3D';
import { getEnergyConsumptionRange } from '../../utils/heatmapColors';

interface BuildingSceneProps {
  buildingModel: BuildingModel;
  meterData: MeterData;
  energyType: EnergyType;
  selectedFloor: string | null;
  selectedDevice: string | null;
  cameraState: CameraState | null;
  onSelectFloor: (floorId: string | null) => void;
  onSelectDevice: (deviceId: string | null) => void;
  onCameraChange: (state: CameraState) => void;
}

const CameraController = ({
  cameraState,
  onCameraChange,
}: {
  cameraState: CameraState | null;
  onCameraChange: (state: CameraState) => void;
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (cameraState && controlsRef.current) {
      camera.position.set(...cameraState.position);
      controlsRef.current.target.set(...cameraState.target);
      controlsRef.current.update();
    }
  }, [cameraState, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.2}
      onChange={() => {
        if (controlsRef.current) {
          onCameraChange({
            position: [camera.position.x, camera.position.y, camera.position.z] as [
              number,
              number,
              number
            ],
            target: [
              controlsRef.current.target.x,
              controlsRef.current.target.y,
              controlsRef.current.target.z,
            ] as [number, number, number],
          });
        }
      }}
    />
  );
};

const BuildingScene = ({
  buildingModel,
  meterData,
  energyType,
  selectedFloor,
  selectedDevice,
  cameraState,
  onSelectFloor,
  onSelectDevice,
  onCameraChange,
}: BuildingSceneProps) => {
  const floorEnergyRange = getEnergyConsumptionRange(meterData.floorMeters, energyType);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 20]} intensity={1} castShadow />
      <directionalLight position={[-20, 10, -10]} intensity={0.3} />

      <Grid
        position={[0, -0.5, 0]}
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />

      {buildingModel.floors.map((floor) => (
        <Floor3D
          key={floor.id}
          floor={floor}
          floorMeter={meterData.floorMeters.find((fm) => fm.floorId === floor.id)}
          energyType={energyType}
          floorEnergyRange={floorEnergyRange}
          isSelected={selectedFloor === floor.id}
          selectedDevice={selectedDevice}
          onSelect={onSelectFloor}
          onSelectDevice={onSelectDevice}
        />
      ))}

      <CameraController cameraState={cameraState} onCameraChange={onCameraChange} />

      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
};

interface Building3DProps {
  buildingModel: BuildingModel;
  meterData: MeterData;
  energyType: EnergyType;
  selectedFloor: string | null;
  selectedDevice: string | null;
  cameraState: CameraState | null;
  onSelectFloor: (floorId: string | null) => void;
  onSelectDevice: (deviceId: string | null) => void;
  onCameraChange: (state: CameraState) => void;
}

export const Building3D = ({
  buildingModel,
  meterData,
  energyType,
  selectedFloor,
  selectedDevice,
  cameraState,
  onSelectFloor,
  onSelectDevice,
  onCameraChange,
}: Building3DProps) => {
  return (
    <Canvas
      camera={{ position: [30, 25, 35], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectFloor(null);
          onSelectDevice(null);
        }
      }}
    >
      <BuildingScene
        buildingModel={buildingModel}
        meterData={meterData}
        energyType={energyType}
        selectedFloor={selectedFloor}
        selectedDevice={selectedDevice}
        cameraState={cameraState}
        onSelectFloor={onSelectFloor}
        onSelectDevice={onSelectDevice}
        onCameraChange={onCameraChange}
      />
    </Canvas>
  );
};
