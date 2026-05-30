import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PointCloud } from './PointCloud';
import { Axes3D } from './AxesHelper';
import { GridFloor } from './GridFloor';
import { useAppStore } from '../../store/useAppStore';
import { createSavedView, saveViewsToStorage } from '../../utils/cameraUtils';

function SceneContent() {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  
  const setFilters = useAppStore(state => state.setFilters);
  const filters = useAppStore(state => state.filters);
  const savedViews = useAppStore(state => state.savedViews);
  const currentViewId = useAppStore(state => state.savedViews.find(v => 
    JSON.stringify(v.filters) === JSON.stringify(filters)
  )?.id);

  useEffect(() => {
    camera.position.set(15, 40, 35);
    camera.lookAt(5, 50, 5);
  }, [camera]);

  useEffect(() => {
    if (!currentViewId || !controlsRef.current) return;
    
    const view = savedViews.find(v => v.id === currentViewId);
    if (view) {
      camera.position.set(...view.cameraPosition);
      controlsRef.current.target.set(...view.cameraTarget);
      setFilters(view.filters);
    }
  }, [currentViewId, savedViews, camera, setFilters]);

  const handleSaveView = (name: string) => {
    if (!controlsRef.current) return;
    
    const newView = createSavedView(
      name,
      [camera.position.x, camera.position.y, camera.position.z],
      [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
      filters
    );
    
    const updated = [...savedViews, newView];
    saveViewsToStorage(updated);
    useAppStore.setState({ savedViews: updated });
  };

  useEffect(() => {
    (window as any).saveCurrentView = handleSaveView;
  }, [filters, savedViews, camera]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        color="#FFF8E7"
        castShadow
      />
      <directionalLight
        position={[-10, 15, -10]}
        intensity={0.6}
        color="#E6F3FF"
      />
      <pointLight position={[5, 50, 5]} intensity={0.5} color="#8B2323" />
      
      <fog attach="fog" args={['#121218', 30, 80]} />
      
      <Axes3D />
      <GridFloor />
      <PointCloud />
      
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.1}
        target={[5, 50, 5]}
      />
      
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
        />
      </EffectComposer>
      
      <Environment preset="city" />
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [15, 40, 35], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#121218' }}
    >
      <color attach="background" args={['#121218']} />
      <SceneContent />
    </Canvas>
  );
}
