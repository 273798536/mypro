import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useRiskStore } from '../../store/useRiskStore';
import { RiskTerrain } from './RiskTerrain';
import { InstitutionPoint } from './InstitutionPoint';

interface CameraControllerProps {
  isPlaying: boolean;
}

const CameraController = ({ isPlaying }: CameraControllerProps) => {
  const { camera } = useThree();

  useFrame((state) => {
    if (isPlaying) {
      const angle = state.clock.elapsedTime * 0.1;
      const radius = 12;
      camera.position.x = Math.cos(angle) * radius;
      camera.position.z = Math.sin(angle) * radius;
      camera.position.y = 8;
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

interface SceneContentProps {
  institutionsOverride?: any[];
}

const SceneContent = ({ institutionsOverride }: SceneContentProps) => {
  const institutions = useRiskStore((state) => state.institutions);
  const riskScores = useRiskStore((state) => state.riskScores);
  const anomalies = useRiskStore((state) => state.anomalies);
  const selectedInstitutionId = useRiskStore((state) => state.selectedInstitutionId);
  const setSelectedInstitution = useRiskStore((state) => state.setSelectedInstitution);
  const isPlaying = useRiskStore((state) => state.isPlaying);
  const currentTimeIndex = useRiskStore((state) => state.currentTimeIndex);
  const timeFrames = useRiskStore((state) => state.timeFrames);
  const filters = useRiskStore((state) => state.filters);

  const filteredInstitutions = useMemo(() => {
    const currentTimestamp = timeFrames[currentTimeIndex]?.timestamp;
    
    return institutions
      .map((inst) => {
        const score = riskScores.find(
          (s) => s.institutionId === inst.id && s.timestamp === currentTimestamp
        );
        const instAnomalies = anomalies.filter((a) => a.institutionId === inst.id);

        return {
          ...inst,
          score: score?.score ?? 0,
          level: score?.level ?? 'low',
          anomalies: instAnomalies,
        };
      })
      .filter((inst) => {
        if (filters.institutionTypes.length > 0 && !filters.institutionTypes.includes(inst.type)) {
          return false;
        }
        if (filters.regions.length > 0 && !filters.regions.includes(inst.region)) {
          return false;
        }
        if (
          filters.industries.length > 0 &&
          (!inst.industry || !filters.industries.includes(inst.industry))
        ) {
          return false;
        }
        if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(inst.level)) {
          return false;
        }
        if (inst.score < filters.scoreRange[0] || inst.score > filters.scoreRange[1]) {
          return false;
        }
        return true;
      });
  }, [institutions, riskScores, anomalies, timeFrames, currentTimeIndex, filters]);

  const displayInstitutions = institutionsOverride || filteredInstitutions;

  return (
    <>
      <CameraController isPlaying={isPlaying} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[10, 5, 10]} intensity={0.3} color="#00f5d4" />

      <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

      <RiskTerrain institutions={displayInstitutions} />

      <gridHelper args={[14, 28, '#00d4ff', '#1e3a5f']} position={[0, -0.1, 0]} />

      {displayInstitutions.map((institution) => (
        <InstitutionPoint
          key={institution.id}
          institution={institution}
          isSelected={selectedInstitutionId === institution.id}
          onClick={() => setSelectedInstitution(institution.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        enabled={!isPlaying}
      />
    </>
  );
};

interface ThreeSceneProps {
  institutionsOverride?: any[];
}

export const ThreeScene = ({ institutionsOverride }: ThreeSceneProps) => {
  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: true }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          useRiskStore.getState().setSelectedInstitution(null);
        }
      }}
    >
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 15, 35]} />
      <SceneContent institutionsOverride={institutionsOverride} />
    </Canvas>
  );
};
