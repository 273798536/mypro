import { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { FundData, ThreeDPoint } from '../../types';
import { useStore } from '../../store/useStore';
import { StarPoints } from './StarPoints';
import { Axes } from './Axes';
import { StarField } from './StarField';

export const Scene3D = () => {
  const { filteredFunds, setSelectedFund, setHoveredFundId, updateAlerts } = useStore();
  const [points, setPoints] = useState<ThreeDPoint[]>([]);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (points.length > 0) {
      updateAlerts(points);
    }
  }, [points, updateAlerts]);

  const handlePointHover = useCallback((fund: FundData | null) => {
    setHoveredFundId(fund ? fund.id : null);
  }, [setHoveredFundId]);

  const handlePointClick = useCallback((fund: FundData) => {
    setSelectedFund(fund);
  }, [setSelectedFund]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedFund(null);
    }
  }, [setSelectedFund]);

  return (
    <div 
      className="w-full h-full"
      onClick={handleCanvasClick}
    >
      <Canvas
        camera={{ position: [30, 30, 30], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a1628']} />
        
        <fog attach="fog" args={['#0a1628', 50, 150]} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[50, 50, 50]} intensity={1} color="#ffffff" />
        <pointLight position={[-50, -50, -50]} intensity={0.5} color="#00d4ff" />
        <directionalLight position={[0, 50, 0]} intensity={0.5} />

        <StarField />
        
        <Axes />
        
        <StarPoints
          funds={filteredFunds}
          onPointHover={handlePointHover}
          onPointClick={handlePointClick}
          setPoints={setPoints}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={100}
          autoRotate={false}
        />

        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
