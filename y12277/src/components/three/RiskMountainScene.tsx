import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Terrain } from './Terrain';
import { InstitutionMarker } from './InstitutionMarker';
import { RegionOverlay } from './RegionOverlay';
import { useAppStore } from '../../store/useAppStore';

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const selectedInstitutionId = useAppStore(state => state.selectedInstitutionId);
  const institutions = useAppStore(state => state.institutions);
  const getFilteredInstitutions = useAppStore(state => state.getFilteredInstitutions);

  const targetPosition = useRef(new THREE.Vector3(0, 15, 20));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (selectedInstitutionId) {
      const inst = institutions.find(i => i.id === selectedInstitutionId);
      if (inst) {
        targetLookAt.current.set(inst.coordinateX, 3, inst.coordinateZ);
        targetPosition.current.set(
          inst.coordinateX + 5,
          8,
          inst.coordinateZ + 5
        );
      }
    } else {
      targetLookAt.current.set(0, 0, 0);
      targetPosition.current.set(0, 15, 20);
    }

    camera.position.lerp(targetPosition.current, delta * 1.5);
    
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 1.5);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={8}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 6}
    />
  );
}

function SceneContent() {
  const selectedMonth = useAppStore(state => state.selectedMonth);
  const getFilteredInstitutions = useAppStore(state => state.getFilteredInstitutions);
  const getInstitutionRiskScore = useAppStore(state => state.getInstitutionRiskScore);
  const getInstitutionAnomalies = useAppStore(state => state.getInstitutionAnomalies);
  const regionCoords = useAppStore(state => state.regionCoords);

  const institutions = getFilteredInstitutions();

  const institutionMarkers = useMemo(() => {
    return institutions.map(inst => {
      const score = getInstitutionRiskScore(inst.id, selectedMonth);
      const anomalies = getInstitutionAnomalies(inst.id);
      const relevantAnomalies = anomalies.filter(
        a => a.month === selectedMonth || a.type === 'region_overlap'
      );
      
      return {
        institution: inst,
        riskScore: score,
        hasAnomaly: relevantAnomalies.length > 0,
        anomalyTypes: relevantAnomalies.map(a => a.type)
      };
    });
  }, [institutions, selectedMonth, getInstitutionRiskScore, getInstitutionAnomalies]);

  return (
    <>
      <ambientLight intensity={0.7} color="#ffffff" />
      <hemisphereLight args={['#87ceeb', '#1a1a2e', 0.8]} />
      
      <directionalLight
        position={[10, 25, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      
      <directionalLight
        position={[-10, 15, -10]}
        intensity={0.6}
        color="#6ab0ff"
      />
      
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00d4ff" />

      <Terrain />

      <RegionOverlay regionCoords={regionCoords} />

      {institutionMarkers.map(({ institution, riskScore, hasAnomaly, anomalyTypes }) => (
        <InstitutionMarker
          key={institution.id}
          institution={institution}
          riskScore={riskScore}
          hasAnomaly={hasAnomaly}
          anomalyTypes={anomalyTypes}
        />
      ))}

      <gridHelper args={[40, 40, '#1e3a5f', '#0f2744']} position={[0, 0.01, 0]} />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

      <fog attach="fog" args={['#0f2744', 35, 70]} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.85}
          intensity={1.2}
          mipmapBlur
        />
        <FXAA />
      </EffectComposer>
    </>
  );
}

export function RiskMountainScene() {
  return (
    <Canvas
      camera={{ position: [0, 20, 25], fov: 55 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
      onCreated={({ gl }) => {
        gl.setClearColor('#0f2744');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
    >
      <CameraController />
      <SceneContent />
    </Canvas>
  );
}
