import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Magnet3D } from './Magnet3D';
import { FieldLines3D } from './FieldLines3D';
import { useMagneticStore } from '@/store/magneticStore';

interface SceneControllerProps {
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

function SceneController({ onCanvasReady }: SceneControllerProps) {
  const { gl } = useThree();
  
  useEffect(() => {
    if (gl.domElement) {
      onCanvasReady(gl.domElement);
    }
  }, [gl, onCanvasReady]);
  
  return null;
}

interface MagneticSceneContentProps {
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

function MagneticSceneContent({ onCanvasReady }: MagneticSceneContentProps) {
  const {
    magnets,
    fieldLines,
    showFieldLines,
    selectedMagnetId,
    selectMagnet,
    warnings
  } = useMagneticStore();

  const highlightedLineIds = warnings.flatMap(w => w.affectedLines);

  const handleBackgroundClick = () => {
    selectMagnet(null);
  };

  return (
    <>
      <SceneController onCanvasReady={onCanvasReady} />
      
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00d4ff" />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      
      <Grid
        infiniteGrid
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a365d"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2d4a6f"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />
      
      <mesh onClick={handleBackgroundClick} position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {showFieldLines && (
        <FieldLines3D fieldLines={fieldLines} highlightedLineIds={highlightedLineIds} />
      )}
      
      {magnets.map(magnet => (
        <Magnet3D
          key={magnet.id}
          magnet={magnet}
          isSelected={selectedMagnetId === magnet.id}
          onSelect={selectMagnet}
        />
      ))}
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
      />
      
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
        />
      </EffectComposer>
    </>
  );
}

interface MagneticSceneProps {
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export function MagneticScene({ onCanvasReady }: MagneticSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 3, 6], fov: 60 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ background: 'linear-gradient(to bottom, #0a1628, #0f2847)' }}
    >
      <fog attach="fog" args={['#0a1628', 5, 30]} />
      <MagneticSceneContent onCanvasReady={onCanvasReady} />
    </Canvas>
  );
}
