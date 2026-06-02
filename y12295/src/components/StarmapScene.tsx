import { useState, useEffect, useMemo } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Select } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, FXAA } from '@react-three/postprocessing';
import type { DataPoint } from '../types';
import { useStarmapStore } from '../store/useStarmapStore';
import { generateColorScale } from '../utils/colorUtils';
import { StarBackground } from './StarBackground';
import { PointCloud } from './PointCloud';
import { OverlapHulls } from './OverlapHulls';
import { AxisGrid } from './AxisGrid';
import { HoverTooltip } from './HoverTooltip';
import { useCameraState } from '../hooks/useCameraState';

interface StarmapSceneProps {
  onScreenshotReady?: (dataUrl: string) => void;
}

function SceneContent({ onScreenshotReady }: StarmapSceneProps) {
  const dataPoints = useStarmapStore(s => s.dataPoints);
  const filters = useStarmapStore(s => s.filters);
  const showOverlapHulls = useStarmapStore(s => s.showOverlapHulls);
  const overlapRegions = useStarmapStore(s => s.overlapRegions);
  const qualityReport = useStarmapStore(s => s.qualityReport);
  const setSelectedPointIds = useStarmapStore(s => s.setSelectedPointIds);
  const selectedPointIds = useStarmapStore(s => s.selectedPointIds);
  
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const { gl, scene, camera } = useThree();
  const { controlsRef, getCameraState } = useCameraState();
  
  const labels = useMemo(() => {
    const uniqueLabels = new Set(dataPoints.map(p => p.trueLabel));
    return Array.from(uniqueLabels).sort();
  }, [dataPoints]);
  
  const filteredPoints = useMemo(() => {
    const overlapPointIds = new Set(overlapRegions.flatMap(r => 
      dataPoints.filter(p => {
        const dist = Math.sqrt(
          Math.pow(p.embedding[0] - r.center[0], 2) +
          Math.pow(p.embedding[1] - r.center[1], 2) +
          Math.pow(p.embedding[2] - r.center[2], 2)
        );
        return dist < r.size;
      }).map(p => p.id)
    ));
    
    return dataPoints.filter(p => {
      if (!filters.selectedLabels.includes(p.trueLabel)) return false;
      if (p.confidence < filters.confidenceRange[0] || p.confidence > filters.confidenceRange[1]) return false;
      if (!filters.selectedGroups.includes(p.group)) return false;
      if (filters.showOverlapOnly && !overlapPointIds.has(p.id)) return false;
      if (!filters.showOccluded && p.isOccluded) return false;
      return true;
    });
  }, [dataPoints, filters, overlapRegions]);
  
  const colorScale = useMemo(() => generateColorScale(labels), [labels]);
  
  const hasDataQualityIssues = qualityReport && (
    qualityReport.hasMissingVectors || 
    qualityReport.stabilityScore < 0.5
  );
  
  useEffect(() => {
    if (onScreenshotReady) {
      const handleScreenshot = () => {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        getCameraState();
        onScreenshotReady(dataUrl);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__takeStarmapScreenshot = handleScreenshot;
    }
  }, [gl, scene, camera, onScreenshotReady, getCameraState]);
  
  const handlePointClick = (pointId: string, addToSelection: boolean) => {
    if (addToSelection) {
      if (selectedPointIds.includes(pointId)) {
        setSelectedPointIds(selectedPointIds.filter(id => id !== pointId));
      } else {
        setSelectedPointIds([...selectedPointIds, pointId]);
      }
    } else {
      setSelectedPointIds([pointId]);
    }
  };
  
  const handleSceneClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.target === gl.domElement) {
      setSelectedPointIds([]);
    }
  };
  
  if (filteredPoints.length === 0) {
    return (
      <group>
        <StarBackground />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
      </group>
    );
  }
  
  return (
    <>
      <Select>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4488ff" />
        
        <StarBackground />
        <AxisGrid />
        
        {showOverlapHulls && (
          <OverlapHulls regions={overlapRegions} colorScale={colorScale} />
        )}
        
        <PointCloud
          points={filteredPoints}
          colorScale={colorScale}
          onPointClick={handlePointClick}
          onPointHover={setHoveredPoint}
        />
        
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
          onClick={handleSceneClick}
        />
      </Select>
      
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.2}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
        <FXAA />
      </EffectComposer>
      
      {hoveredPoint && (
        <div className="fixed inset-0 pointer-events-none z-40" style={{
          left: (window.event as MouseEvent)?.clientX || 0,
          top: (window.event as MouseEvent)?.clientY || 0,
        }}>
          <HoverTooltip point={hoveredPoint} colorScale={colorScale} />
        </div>
      )}
      
      {hasDataQualityIssues && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-red-900/80 backdrop-blur-sm border border-red-500 rounded-lg px-4 py-2 text-red-200 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>数据质量警告：3D嵌入可能存在失真，请谨慎解读</span>
          </div>
        </div>
      )}
    </>
  );
}

export function StarmapScene({ onScreenshotReady }: StarmapSceneProps) {
  return (
    <Canvas
      camera={{ position: [12, 8, 12], fov: 60 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0A0E27');
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={['#0A0E27', 20, 60]} />
      <SceneContent onScreenshotReady={onScreenshotReady} />
    </Canvas>
  );
}
