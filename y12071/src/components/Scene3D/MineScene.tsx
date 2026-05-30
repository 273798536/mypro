import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Plane } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, useCurrentResults } from '../../store/useStore';
import { TunnelSegment } from './TunnelSegment';
import { SupportNode } from './SupportNode';
import { SensorNode } from './SensorNode';
import { PersonnelPath } from './PersonnelPath';
import { DetectionMarker } from './DetectionMarker';

function SceneContent() {
  const { scenario, ui, detection } = useStore();
  const currentResults = useCurrentResults();
  const scanRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (detection.isDetecting && scanRef.current) {
      const t = (clock.getElapsedTime() * 10) % 80;
      scanRef.current.position.x = t;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[30, 30, 30]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.4} />
      
      <fog attach="fog" args={['#0a0f1a', 40, 120]} />

      <Grid
        args={[200, 200]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[30, -3, 7.5]}
      />

      {scenario.tunnelSegments.map(segment => (
        <TunnelSegment 
          key={segment.id} 
          segment={segment} 
          showLabel={ui.showLabels}
        />
      ))}

      {scenario.supportPoints.map(support => (
        <SupportNode 
          key={support.id} 
          support={support}
          showLabel={ui.showLabels}
        />
      ))}

      {scenario.sensors.map(sensor => (
        <SensorNode 
          key={sensor.id} 
          sensor={sensor}
          showLabel={ui.showLabels}
        />
      ))}

      {scenario.personnelRoute && (
        <PersonnelPath 
          route={scenario.personnelRoute}
          showLabel={ui.showLabels}
        />
      )}

      {currentResults.map(detection => (
        <DetectionMarker
          key={detection.id}
          detection={detection}
          isSelected={ui.selectedDetectionId === detection.id}
        />
      ))}

      {detection.isDetecting && (
        <Plane ref={scanRef} args={[10, 20]} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 7.5]}>
          <meshBasicMaterial color="#1E88E5" transparent opacity={0.3} side={THREE.DoubleSide} />
        </Plane>
      )}

      {ui.showSectionPlane && (
        <Plane 
          args={[30, 30]} 
          position={ui.sectionPlanePosition}
          rotation={[0, Math.PI / 2, 0]}
        >
          <meshBasicMaterial color="#1E88E5" transparent opacity={0.2} side={THREE.DoubleSide} />
        </Plane>
      )}

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={100}
        target={[30, 0, 7.5]}
      />
    </>
  );
}

export function MineScene() {
  return (
    <Canvas
      camera={{ position: [50, 35, 40], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0f1a');
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
