import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../store';
import { StarField } from './StarField';
import { ProductNodes } from './ProductNodes';
import { ConnectionLines } from './ConnectionLines';

function CameraController() {
  const { selectedProductId, nodes3D } = useAppStore();
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedProductId || !controlsRef.current) return;

    const node = nodes3D.find((n) => n.productId === selectedProductId);
    if (!node) return;

    const targetPosition = new THREE.Vector3(
      node.position[0] + 8,
      node.position[1] + 5,
      node.position[2] + 8
    );

    const startPosition = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const endTarget = new THREE.Vector3(node.position[0], node.position[1], node.position[2]);

    let progress = 0;
    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime: number) {
      progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPosition, targetPosition, eased);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, eased);
      controlsRef.current.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [selectedProductId, nodes3D, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={10}
      maxDistance={80}
      enableDamping
      dampingFactor={0.05}
      makeDefault
    />
  );
}

function SceneContent() {
  const { nodes3D } = useAppStore();

  return (
    <>
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 30, 80]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[20, 20, 20]} intensity={1} color="#00D4FF" distance={100} />
      <pointLight position={[-20, -10, -20]} intensity={0.5} color="#A55EEA" distance={100} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <StarField count={800} />

      <gridHelper
        args={[100, 50, '#1E3A5F', '#162A4A']}
        position={[0, -8, 0]}
        rotation={[0, 0, 0]}
      />

      <axesHelper args={[15]} position={[-25, -8, -25]} />

      <ConnectionLines nodes={nodes3D} />
      <ProductNodes nodes={nodes3D} />

      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function Scene3D() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.setClearColor('#0A1628');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
      }}
      style={{ cursor: 'grab' }}
    >
      <PerspectiveCamera makeDefault position={[0, 15, 35]} fov={60} />
      <CameraController />
      <SceneContent />
    </Canvas>
  );
}
