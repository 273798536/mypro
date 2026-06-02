import { useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { CarModel } from './CarModel';
import { StreamLines } from './StreamLines';
import { RiskMarkers } from './RiskMarkers';
import { useAppStore } from '../../store/useAppStore';
import { WindParams, StreamLine, RiskPoint } from '../../types';
import { generateStreamLines } from '../../utils/streamGenerator';
import { detectAllRisks } from '../../utils/riskDetector';

interface SceneContentProps {
  streamLines: StreamLine[];
  riskPoints: RiskPoint[];
  showRiskLabels: boolean;
}

function SceneContent({ streamLines, riskPoints, showRiskLabels }: SceneContentProps) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <directionalLight position={[0, -5, 0]} intensity={0.2} />

      <CarModel />
      <StreamLines lines={streamLines} />
      <RiskMarkers risks={riskPoints} showLabels={showRiskLabels} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a14" metalness={0.5} roughness={0.8} />
      </mesh>

      <gridHelper args={[20, 20, '#1a1a2e', '#0f0f1a']} position={[0, 0, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        target={[0, 0.5, -1.5]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

interface Scene3DProps {
  windParams?: WindParams;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export function Scene3D({ windParams, className, canvasRef }: Scene3DProps) {
  const { currentWindParams, showRiskLabels, updateStreamLines } = useAppStore();
  const storeStreamLines = useAppStore((s) => s.streamLines);
  const storeRiskPoints = useAppStore((s) => s.riskPoints);

  const isExternalParams = !!windParams;

  const externalData = useMemo(() => {
    if (!windParams) return { streamLines: [], riskPoints: [] };
    const sl = generateStreamLines(windParams);
    const rp = detectAllRisks(sl, windParams);
    return { streamLines: sl, riskPoints: rp };
  }, [windParams]);

  useEffect(() => {
    if (!isExternalParams) {
      updateStreamLines();
    }
  }, [isExternalParams, updateStreamLines]);

  const streamLines = isExternalParams ? externalData.streamLines : storeStreamLines;
  const riskPoints = isExternalParams ? externalData.riskPoints : storeRiskPoints;

  const handleCanvasCreated = useCallback(
    (state: { gl: { domElement: HTMLCanvasElement } }) => {
      if (canvasRef) {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current =
          state.gl.domElement;
      }
    },
    [canvasRef]
  );

  return (
    <Canvas
      camera={{ position: [5, 3, 5], fov: 50 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      className={className}
      style={{ background: '#0a0a14' }}
      onCreated={handleCanvasCreated}
    >
      <SceneContent
        streamLines={streamLines}
        riskPoints={riskPoints}
        showRiskLabels={showRiskLabels}
      />
    </Canvas>
  );
}
