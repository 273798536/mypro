import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Portfolio, AxisMapping, EfficientFrontierResult } from '../../types/portfolio';
import type { Vector3 } from 'three';
import { Axis3D } from './Axis3D';
import { EfficientFrontier } from './EfficientFrontier';
import { PortfolioPoints } from './PortfolioPoints';
import { generateEfficientFrontier } from '../../engine/efficientFrontier';
import { useFilterStore } from '../../store/useFilterStore';
import { useDataStore } from '../../store/useDataStore';
import { covarianceMatrix } from '../../mock/sampleData';

interface Scene3DProps {
  portfolios: Portfolio[];
  efficientFrontier: EfficientFrontierResult | null;
  selectedPortfolioId: string | null;
  hoveredPortfolioId: string | null;
  onPortfolioClick: (portfolio: Portfolio | null) => void;
  onPortfolioHover: (portfolioId: string | null) => void;
  showSurface: boolean;
  showPoints: boolean;
  showAxes: boolean;
  highlightOptimal: boolean;
}

const SceneContent: React.FC<{
  portfolios: Portfolio[];
  surfacePoints: Vector3[][];
  xAxis: AxisMapping;
  yAxis: AxisMapping;
  zAxis: AxisMapping;
  showSurface: boolean;
  showPoints: boolean;
  showAxes: boolean;
  highlightOptimal: boolean;
  selectedId: string | null;
  comparisonIds: string[];
  optimalId: string | undefined;
  onSelect: (id: string | null) => void;
  onHoverId: (id: string | null) => void;
}> = ({
  portfolios,
  surfacePoints,
  xAxis,
  yAxis,
  zAxis,
  showSurface,
  showPoints,
  showAxes,
  highlightOptimal,
  selectedId,
  comparisonIds,
  optimalId,
  onSelect,
  onHoverId
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleHover = (portfolio: Portfolio | null) => {
    onHoverId(portfolio?.id ?? null);
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ffd700" />
      <pointLight position={[5, -2, 5]} intensity={0.3} color="#4da6ff" />

      <Stars
        radius={100}
        depth={50}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      {showAxes && (
        <Axis3D xAxis={xAxis} yAxis={yAxis} zAxis={zAxis} scale={1} />
      )}

      <group>
        <EfficientFrontier
          surfacePoints={surfacePoints}
          visible={showSurface && isLoaded}
          opacity={0.35}
        />
      </group>

      <group>
        <PortfolioPoints
          portfolios={portfolios}
          xAxis={xAxis}
          yAxis={yAxis}
          zAxis={zAxis}
          selectedId={selectedId}
          comparisonIds={comparisonIds}
          onSelect={onSelect}
          onHover={handleHover}
          visible={showPoints && isLoaded}
          highlightOptimal={highlightOptimal}
          optimalId={optimalId}
        />
      </group>

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={5}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
};

export const Scene3D: React.FC<Scene3DProps> = ({
  portfolios,
  efficientFrontier,
  selectedPortfolioId,
  hoveredPortfolioId: _hoveredPortfolioId,
  onPortfolioClick,
  onPortfolioHover,
  showSurface,
  showPoints,
  showAxes,
  highlightOptimal
}) => {
  const { sceneSettings } = useFilterStore();
  const { assets, comparisonPortfolioIds } = useDataStore();

  const frontierResult = useMemo(() => {
    if (efficientFrontier) return efficientFrontier;
    if (assets.length === 0) {
      return { portfolios: [], surfacePoints: [] } as EfficientFrontierResult;
    }
    return generateEfficientFrontier(assets, covarianceMatrix, 50);
  }, [assets, efficientFrontier]);

  const surfacePoints = frontierResult.surfacePoints || [];
  const optimalId = frontierResult.maxSharpePortfolio?.id;

  const handleSelect = (id: string | null) => {
    const portfolio = id ? portfolios.find(p => p.id === id) || null : null;
    onPortfolioClick(portfolio);
  };

  return (
    <Canvas
      camera={{ position: [1.2, 1, 1.2], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#0a1628'), 1);
      }}
    >
      <fog attach="fog" args={['#0a1628', 2, 8]} />
      <SceneContent
        portfolios={portfolios}
        surfacePoints={surfacePoints}
        xAxis={sceneSettings.xAxis}
        yAxis={sceneSettings.yAxis}
        zAxis={sceneSettings.zAxis}
        showSurface={showSurface}
        showPoints={showPoints}
        showAxes={showAxes}
        highlightOptimal={highlightOptimal}
        selectedId={selectedPortfolioId}
        comparisonIds={comparisonPortfolioIds}
        optimalId={optimalId}
        onSelect={handleSelect}
        onHoverId={onPortfolioHover}
      />
    </Canvas>
  );
};
