import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { OrganMesh } from './OrganMesh';
import { DoseCloud } from './DoseCloud';
import { IssueMarker } from './IssueMarker';
import { useAppStore } from '../../store/useAppStore';
import type { DetectionIssue } from '../../types';

function Scene() {
  const { organs, doses, issues, selectedOrganId, selectOrgan } = useAppStore();
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(150, 100, 150);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const visibleOrgans = organs.filter((o) => o.visible);
  const visibleDoses = doses.filter((d) => d.visible);
  const unresolvedIssues = issues.filter((i) => !i.resolved && i.position);

  const handleIssueClick = (issue: DetectionIssue) => {
    if (issue.organId) {
      selectOrgan(issue.organId);
    }
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 100, 50]}
        intensity={0.8}
        castShadow
      />
      <directionalLight
        position={[-50, 50, -50]}
        intensity={0.4}
      />
      <pointLight position={[0, 50, 0]} intensity={0.3} />

      <gridHelper args={[200, 20, 0x334155, 0x1e293b]} position={[0, -50, 0]} />

      <group>
        <arrowHelper
          args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 50, 0xff0000, 5, 3]}
        />
        <arrowHelper
          args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 50, 0x00ff00, 5, 3]}
        />
        <arrowHelper
          args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 50, 0x0000ff, 5, 3]}
        />
      </group>

      {visibleOrgans.map((organ) => (
        <OrganMesh
          key={organ.id}
          organ={organ}
          isSelected={selectedOrganId === organ.id}
          onClick={() => selectOrgan(organ.id)}
        />
      ))}

      {visibleDoses.map((dose) => {
        const organ = organs.find((o) => o.id === dose.organId);
        if (!organ) return null;
        return (
          <DoseCloud
            key={dose.id}
            dose={dose}
            organPosition={organ.position}
          />
        );
      })}

      {unresolvedIssues.map((issue) => (
        <IssueMarker
          key={issue.id}
          issue={issue}
          onClick={() => handleIssueClick(issue)}
        />
      ))}

      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
        />
        <FXAA />
      </EffectComposer>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={400}
        enablePan={true}
      />
    </>
  );
}

export function Viewer3D() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => useAppStore.getState().selectOrgan(null)}
    >
      <PerspectiveCamera makeDefault fov={45} near={0.1} far={1000} />
      <color attach="background" args={['#0a192f']} />
      <fog attach="fog" args={['#0a192f', 200, 500]} />
      <Scene />
    </Canvas>
  );
}
