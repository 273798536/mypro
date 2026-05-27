import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Tunnel } from './Tunnel';
import { AirDoor } from './AirDoor';
import { SmokeSystem } from './SmokeSystem';
import { Person } from './Person';
import { EscapeRoute } from './EscapeRoute';
import { useMineStore } from '@/store/useMineStore';

export function MineScene() {
  const selectedRecord = useMineStore((state) => state.getSelectedRecord());
  const showSmoke = useMineStore((state) => state.showSmoke);
  const showRoute = useMineStore((state) => state.showRoute);
  const showDoors = useMineStore((state) => state.showDoors);
  const showPersons = useMineStore((state) => state.showPersons);
  const setSelectedObject = useMineStore((state) => state.setSelectedObject);

  if (!selectedRecord) return null;

  const doorErrorIds = selectedRecord.alerts
    .filter((a) => a.type === 'door_error')
    .map((a) => a.objectId);

  const smokeErrorIds = selectedRecord.alerts
    .filter((a) => a.type === 'smoke_reverse')
    .map((a) => a.objectId);

  const defaultWind: [number, number, number] =
    selectedRecord.windFlows[0]?.direction || [1, 0, 0];

  return (
    <Canvas
      camera={{ position: [15, 20, 25], fov: 50 }}
      onClick={() => setSelectedObject(null)}
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}
    >
      <fog attach="fog" args={['#1a1a2e', 30, 80]} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />

      <Tunnel />

      {showDoors &&
        selectedRecord.airDoors.map((door) => (
          <AirDoor
            key={door.id}
            door={door}
            hasError={doorErrorIds.includes(door.id)}
          />
        ))}

      {showSmoke &&
        selectedRecord.smokeSources.map((smoke) => (
          <SmokeSystem
            key={smoke.id}
            smokeSource={smoke}
            windDirection={defaultWind}
            hasError={smokeErrorIds.includes(smoke.id) || smoke.reverseFlow === true}
          />
        ))}

      {showPersons &&
        selectedRecord.persons.map((person) => (
          <Person key={person.id} person={person} />
        ))}

      {showRoute &&
        selectedRecord.escapeRoutes.map((route) => (
          <EscapeRoute key={route.id} route={route} />
        ))}
    </Canvas>
  );
}
