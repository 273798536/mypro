import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Earth from './Earth';
import Route from './Route';
import WaypointMarker from './WaypointMarker';
import StormCloud from './StormCloud';
import NoFlyZone from './NoFlyZone';
import { useFlightStore } from '../store/useFlightStore';

const SceneContent = () => {
  const {
    currentRoute,
    selectedWaypointId,
    selectWaypoint,
    storms,
    noFlyZones,
    collisionResult,
  } = useFlightStore();

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1}
        castShadow
      />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#4a90d9" />

      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      <Earth />

      {storms.map((storm) => (
        <StormCloud key={storm.id} storm={storm} />
      ))}

      {noFlyZones.map((zone) => (
        <NoFlyZone key={zone.id} zone={zone} />
      ))}

      {currentRoute && (
        <>
          <Route
            waypoints={currentRoute.waypoints}
            violations={collisionResult?.violations || []}
          />
          {currentRoute.waypoints.map((waypoint) => (
            <WaypointMarker
              key={waypoint.id}
              waypoint={waypoint}
              isSelected={selectedWaypointId === waypoint.id}
              onClick={() => selectWaypoint(waypoint.id)}
            />
          ))}
        </>
      )}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        enableDamping
        dampingFactor={0.05}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
        />
      </EffectComposer>
    </>
  );
};

const Scene = () => {
  return (
    <Canvas
      camera={{ position: [0, 2, 6], fov: 45 }}
      style={{ background: 'linear-gradient(to bottom, #0a1628, #1a365d)' }}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent />
    </Canvas>
  );
};

export default Scene;
