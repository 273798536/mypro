import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Container3D } from './Container3D';
import { Ground } from './Ground';
import { useYardStore } from '../../store/useYardStore';
import { getContainerAlerts } from '../../utils/detection';

function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(10, 12, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}

function SceneContent() {
  const { containers, alerts, simulation, getFilteredContainers } = useYardStore();
  const filteredContainers = getFilteredContainers();
  
  const alertMap = useMemo(() => {
    const map = new Map<string, { isAlert: boolean; type: any }>();
    containers.forEach(c => {
      const containerAlerts = getContainerAlerts(c.id, alerts);
      if (containerAlerts.length > 0) {
        map.set(c.id, {
          isAlert: true,
          type: containerAlerts[0].type
        });
      } else {
        map.set(c.id, { isAlert: false, type: null });
      }
    });
    return map;
  }, [containers, alerts]);
  
  const pickedUpContainers = useMemo(() => {
    const picked = new Set<string>();
    for (let i = 0; i < simulation.currentStep; i++) {
      if (simulation.pickupSequence[i]) {
        picked.add(simulation.pickupSequence[i]);
      }
    }
    return picked;
  }, [simulation.currentStep, simulation.pickupSequence]);
  
  return (
    <>
      <CameraController />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#FFB547" />
      <pointLight position={[10, 5, -10]} intensity={0.3} color="#165DFF" />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={['#0F1218', 20, 50]} />
      
      <Ground />
      
      {filteredContainers.map(container => {
        const alertInfo = alertMap.get(container.id) || { isAlert: false, type: null };
        const isPickedUp = pickedUpContainers.has(container.id);
        
        return (
          <Container3D
            key={container.id}
            container={container}
            isAlert={alertInfo.isAlert}
            alertType={alertInfo.type}
            isPickedUp={isPickedUp}
          />
        );
      })}
      
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

export function YardScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 12, 10], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(to bottom, #0F1218 0%, #1D2129 100%)' }}
    >
      <SceneContent />
    </Canvas>
  );
}
