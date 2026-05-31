import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { DamModel3D } from './DamModel3D';
import { CrackMarkers } from './CrackMarkers';
import { HeatMapOverlay, RiskLegend } from './HeatMapOverlay';
import { SensorMarkers } from './SensorMarkers';

export function Viewer3D() {
  const {
    damModel,
    crackPoints,
    sensors,
    heatMapPoints,
    selectedCrackId,
    showHeatMap,
    showCracks,
    showSensors,
    sectionPlaneEnabled,
    sectionPlanePosition,
    setSelectedCrackId,
  } = useAppStore();

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <Canvas
        camera={{
          position: [80, 50, 80],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
        gl={{ localClippingEnabled: true, antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-30, 20, -30]} intensity={0.3} />
        <hemisphereLight args={['#87ceeb', '#3d5a3d', 0.3]} />
        <fog attach="fog" args={['#1e293b', 100, 300]} />
        <DamModel3D
          geometry={damModel.geometry}
          showSection={sectionPlaneEnabled}
          sectionPosition={sectionPlanePosition}
        />
        {showCracks && (
          <CrackMarkers
            cracks={crackPoints}
            selectedId={selectedCrackId}
            onSelect={setSelectedCrackId}
          />
        )}
        {showSensors && <SensorMarkers sensors={sensors} />}
        {showHeatMap && <HeatMapOverlay points={heatMapPoints} />}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={30}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2 - 0.1}
          minPolarAngle={0.2}
        />
        <gridHelper
          args={[200, 40, '#475569', '#334155']}
          position={[0, -0.01, 0]}
        />
      </Canvas>
      <RiskLegend />
      <ViewControls />
    </div>
  );
}

function ViewControls() {
  const {
    showHeatMap,
    showCracks,
    showSensors,
    sectionPlaneEnabled,
    sectionPlanePosition,
    setShowHeatMap,
    setShowCracks,
    setShowSensors,
    setSectionPlaneEnabled,
    setSectionPlanePosition,
  } = useAppStore();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-xl">
        <div className="text-white text-xs font-bold mb-2">显示控制</div>
        <div className="space-y-2">
          <ToggleButton
            label="风险热力图"
            active={showHeatMap}
            onClick={() => setShowHeatMap(!showHeatMap)}
          />
          <ToggleButton
            label="裂缝标注"
            active={showCracks}
            onClick={() => setShowCracks(!showCracks)}
          />
          <ToggleButton
            label="传感器"
            active={showSensors}
            onClick={() => setShowSensors(!showSensors)}
          />
        </div>
      </div>
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-xl">
        <div className="text-white text-xs font-bold mb-2">剖切控制</div>
        <ToggleButton
          label="启用剖切"
          active={sectionPlaneEnabled}
          onClick={() => setSectionPlaneEnabled(!sectionPlaneEnabled)}
        />
        {sectionPlaneEnabled && (
          <div className="mt-2">
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={sectionPlanePosition}
              onChange={(e) => setSectionPlanePosition(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-gray-400 text-[10px] text-center mt-1">
              位置: {sectionPlanePosition.toFixed(1)}m
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-1.5 rounded text-xs font-medium transition-all duration-200
        ${active
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }
      `}
    >
      <span className="mr-1">{active ? '✓' : '○'}</span>
      {label}
    </button>
  );
}
