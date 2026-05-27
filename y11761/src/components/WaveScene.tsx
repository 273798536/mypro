import { useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { WaveSurface } from './WaveSurface';
import { WaveSource } from './WaveSource';
import { ObstacleMesh } from './ObstacleMesh';
import { SamplePointMarker } from './SamplePointMarker';
import { useAppStore } from '@/store/useAppStore';

interface SceneControllerProps {
  onWaterClick: (x: number, y: number) => void;
}

function SceneController({ onWaterClick }: SceneControllerProps) {
  const { gl, camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const isDragging = useRef(false);

  const handleClick = useCallback((event: MouseEvent) => {
    if (isDragging.current) return;

    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersection = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(groundPlane.current, intersection);

    if (intersection) {
      if (Math.abs(intersection.x) <= 5 && Math.abs(intersection.z) <= 5) {
        onWaterClick(intersection.x, intersection.z);
      }
    }
  }, [gl, camera, onWaterClick]);

  const handleMouseDown = () => {
    isDragging.current = false;
  };

  const handleMouseMove = () => {
    isDragging.current = true;
  };

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, handleClick]);

  return null;
}

export function WaveScene() {
  const {
    waveParams,
    obstacles,
    samplePoints,
    displayOptions,
    updateWaveSource,
    updateObstacle,
    removeObstacle,
    addSamplePoint,
    removeSamplePoint,
  } = useAppStore();

  const handleWaterClick = useCallback((x: number, y: number) => {
    addSamplePoint({ x, y });
  }, [addSamplePoint]);

  const handleSourceDrag = useCallback((sourceIndex: 'source1' | 'source2', x: number, y: number) => {
    const clampedX = Math.max(-4.5, Math.min(4.5, x));
    const clampedY = Math.max(-4.5, Math.min(4.5, y));
    updateWaveSource(sourceIndex, { x: clampedX, y: clampedY });
  }, [updateWaveSource]);

  const handleObstacleDrag = useCallback((id: string, x: number, y: number) => {
    const clampedX = Math.max(-4.5, Math.min(4.5, x));
    const clampedY = Math.max(-4.5, Math.min(4.5, y));
    updateObstacle(id, { position: { x: clampedX, y: clampedY } });
  }, [updateObstacle]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 12], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0A2463 0%, #1D3557 50%, #0A2463 100%)' }}
    >
      <SceneController onWaterClick={handleWaterClick} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#3E92CC" />
      <pointLight position={[5, 5, -5]} intensity={0.5} color="#2A9D8F" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

      <group position={[0, -0.5, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0A2463" transparent opacity={0.3} />
        </mesh>
        <gridHelper args={[10, 20, '#1D3557', '#1D3557']} position={[0, 0.01, 0]} />
      </group>

      <WaveSurface gridSize={10} />

      {displayOptions.showWaveSources && (
        <>
          <WaveSource
            source={waveParams.source1}
            index={0}
            onDrag={(x, y) => handleSourceDrag('source1', x, y)}
          />
          <WaveSource
            source={waveParams.source2}
            index={1}
            onDrag={(x, y) => handleSourceDrag('source2', x, y)}
          />
        </>
      )}

      {displayOptions.showObstacles && obstacles.map((obstacle) => (
        <ObstacleMesh
          key={obstacle.id}
          obstacle={obstacle}
          onDrag={(x, y) => handleObstacleDrag(obstacle.id, x, y)}
          onRemove={() => removeObstacle(obstacle.id)}
        />
      ))}

      {displayOptions.showSamplePoints && samplePoints.map((sp) => (
        <SamplePointMarker
          key={sp.id}
          samplePoint={sp}
          onRemove={() => removeSamplePoint(sp.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />

      <fog attach="fog" args={['#0A2463', 15, 30]} />
    </Canvas>
  );
}
