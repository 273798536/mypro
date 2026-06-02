import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Rack } from './Rack';
import { AirVent } from './AirVent';
import { CableTray } from './CableTray';
import { Sensor } from './Sensor';
import { TemperatureField, Floor } from './TemperatureField';
import { mockRacks, mockVents, mockTrays, mockSensors } from '../../data/mockData';
import { useFilterStore } from '../../store/useFilterStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useAlarmStore } from '../../store/useAlarmStore';

function useHighlightSync() {
  const { alarmLevels } = useFilterStore();
  const { selectedAlarm, alarms } = useAlarmStore();
  const { setHighlightedObjectIds } = useSceneStore();

  const ids = useMemo(() => {
    const set = new Set<string>();

    alarms.forEach((alarm) => {
      if (!alarmLevels.includes(alarm.level)) return;
      set.add(alarm.relatedObjectId);
      alarm.clues.forEach((clue) => set.add(clue.relatedId));
    });

    if (selectedAlarm) {
      set.add(selectedAlarm.relatedObjectId);
      selectedAlarm.clues.forEach((clue) => set.add(clue.relatedId));
    }

    return set;
  }, [alarmLevels, selectedAlarm, alarms]);

  useEffect(() => {
    setHighlightedObjectIds(ids);
  }, [ids, setHighlightedObjectIds]);
}

function CameraController() {
  const { focusPosition } = useSceneStore();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (focusPosition && controlsRef.current) {
      controlsRef.current.target.lerp(
        new THREE.Vector3(...focusPosition),
        0.08
      );
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      minDistance={5}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 6}
    />
  );
}

function SceneContent() {
  const { selectedTypes, showTemperatureField, alarmLevels } = useFilterStore();
  const { setSelectedObject, setDetailModalOpen } = useSceneStore();
  const { setSelectedAlarm, getAlarmsByRelatedObject, alarms } = useAlarmStore();

  useHighlightSync();

  const alarmFilteredObjectIds = useMemo(() => {
    const set = new Set<string>();
    alarms.forEach((alarm) => {
      if (!alarmLevels.includes(alarm.level)) return;
      set.add(alarm.relatedObjectId);
      alarm.clues.forEach((clue) => set.add(clue.relatedId));
    });
    return set;
  }, [alarmLevels, alarms]);

  const handleObjectClick3D = (type: 'rack' | 'vent' | 'tray' | 'sensor', id: string, name: string) => {
    setSelectedObject({ type, id, name });
    setDetailModalOpen(true);

    const related = getAlarmsByRelatedObject(id);
    if (related.length > 0) {
      setSelectedAlarm(related[0]);
    }
  };

  const handleBackgroundClick = () => {
    setSelectedObject(null);
    setDetailModalOpen(false);
  };

  const rackVisible = selectedTypes.includes('rack');
  const ventVisible = selectedTypes.includes('vent');
  const trayVisible = selectedTypes.includes('tray');
  const sensorVisible = selectedTypes.includes('sensor');

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00D4FF" />

      <Floor />

      {showTemperatureField && <TemperatureField />}

      {rackVisible &&
        mockRacks.map((rack) => (
          <Rack
            key={rack.id}
            rack={rack}
            isAlarmFiltered={alarmFilteredObjectIds.has(rack.id)}
            onObjectClick={handleObjectClick3D}
          />
        ))}

      {ventVisible &&
        mockVents.map((vent) => (
          <AirVent
            key={vent.id}
            vent={vent}
            isAlarmFiltered={alarmFilteredObjectIds.has(vent.id)}
            onObjectClick={handleObjectClick3D}
          />
        ))}

      {trayVisible &&
        mockTrays.map((tray) => (
          <CableTray
            key={tray.id}
            tray={tray}
            isAlarmFiltered={alarmFilteredObjectIds.has(tray.id)}
            onObjectClick={handleObjectClick3D}
          />
        ))}

      {sensorVisible &&
        mockSensors
          .filter((s) => s.status !== 'normal')
          .map((sensor) => (
            <Sensor
              key={sensor.id}
              sensor={sensor}
              isAlarmFiltered={alarmFilteredObjectIds.has(sensor.id)}
              onObjectClick={handleObjectClick3D}
            />
          ))}

      <mesh onClick={handleBackgroundClick}>
        <sphereGeometry args={[100, 32, 32]} />
        <meshBasicMaterial color="#050a14" side={THREE.BackSide} />
      </mesh>

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
      </EffectComposer>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      style={{ background: '#050a14' }}
    >
      <CameraController />
      <SceneContent />
    </Canvas>
  );
}
