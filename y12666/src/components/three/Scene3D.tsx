import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import Ocean from './Ocean';
import TurbineMesh from './TurbineMesh';
import WakeCone from './WakeCone';
import { useProjectStore } from '@/store/useProjectStore';
import type { Viewpoint } from '@/types';

interface SceneInnerProps {
  sceneRef: React.RefObject<HTMLElement>;
}

function SceneInner({ sceneRef }: SceneInnerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const turbines = useProjectStore((s) => s.turbines);
  const wakeCones = useProjectStore((s) => s.wakeCones);
  const wakeResults = useProjectStore((s) => s.wakeResults);
  const selectedId = useProjectStore((s) => s.selectedTurbineId);
  const highlight = useProjectStore((s) => s.highlight);
  const addViewpoint = useProjectStore((s) => s.addViewpoint);
  const currentModelVersion = useProjectStore((s) => s.currentModelVersion);

  useEffect(() => {
    (window as any).__sceneHelpers = {
      saveViewpoint: (name: string) => {
        const cam = camera as THREE.PerspectiveCamera;
        const controls = controlsRef.current;
        const vp: Omit<Viewpoint, 'id' | 'createdAt'> = {
          name,
          position: [cam.position.x, cam.position.y, cam.position.z] as [
            number,
            number,
            number
          ],
          target: controls
            ? [controls.target.x, controls.target.y, controls.target.z]
            : [0, 50, 0],
        };
        addViewpoint(vp);
        return vp;
      },
      restoreViewpoint: (vp: Viewpoint) => {
        const cam = camera as THREE.PerspectiveCamera;
        cam.position.set(...vp.position);
        if (controlsRef.current) {
          controlsRef.current.target.set(...vp.target);
          controlsRef.current.update();
        }
      },
    };
  }, [camera, addViewpoint]);

  const setSelected = useProjectStore((s) => s.setSelectedTurbineId);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[1500, 1200, 1800]}
        fov={45}
        near={1}
        far={20000}
      />
      <OrbitControls
        ref={controlsRef}
        target={[600, 50, 500]}
        enableDamping
        dampingFactor={0.08}
        minDistance={100}
        maxDistance={5000}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />

      <hemisphereLight args={['#b8d4e8', '#0a3d62', 0.6]} />
      <directionalLight
        position={[500, 1200, 300]}
        intensity={0.9}
        color="#e8f0f8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-3000}
        shadow-camera-right={3000}
        shadow-camera-top={3000}
        shadow-camera-bottom={-3000}
      />
      <directionalLight
        position={[-400, 200, -200]}
        intensity={0.25}
        color="#f4d35e"
      />

      <fog attach="fog" args={['#081A32', 2000, 5500]} />

      <Ocean />

      {wakeCones.map((cone) => (
        <WakeCone
          key={cone.turbineId}
          cone={cone}
          highlighted={
            highlight?.type === 'out-of-bounds' && cone.isOutOfBounds
              ? true
              : highlight?.turbineIds.includes(cone.turbineId) ?? false
          }
        />
      ))}

      {turbines.map((t) => {
        const wakeResult = wakeResults.find((r) => r.turbineId === t.id);
        const isHighlighted =
          highlight?.turbineIds.includes(t.id) ?? false;
        return (
          <TurbineMesh
            key={t.id}
            turbine={t}
            wakeResult={wakeResult}
            selected={selectedId === t.id}
            highlighted={isHighlighted}
            onClick={() => setSelected(selectedId === t.id ? null : t.id)}
          />
        );
      })}

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.75}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function Scene3D({ sceneRef }: { sceneRef: React.RefObject<HTMLElement> }) {
  return (
    <Canvas
      ref={sceneRef as any}
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#081A32']} />
      <SceneInner sceneRef={sceneRef} />
    </Canvas>
  );
}
