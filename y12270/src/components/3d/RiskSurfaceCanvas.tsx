import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { SurfacePoint, BondHolding, Annotation } from '../../types';
import { SceneLights } from './SceneLights';
import { AxesGrid } from './AxesGrid';
import { RiskSurfaceMesh } from './RiskSurfaceMesh';
import { SurfacePoints } from './SurfacePoints';
import { AnnotationsLayer } from './AnnotationsLayer';

interface RiskSurfaceCanvasProps {
  surfaceData: SurfacePoint[][];
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
  holdings: BondHolding[];
  annotations: Annotation[];
  highlightedRegion?: { x: [number, number]; y: [number, number] } | null;
  onPointClick?: (point: SurfacePoint) => void;
  onAnnotationRemove?: (annotationId: string) => void;
  selectedBondId?: string | null;
}

function CameraController({ bounds }: { bounds: RiskSurfaceCanvasProps['bounds'] }) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const xCenter = (bounds.xMin + bounds.xMax) / 2;
    const yCenter = (bounds.yMin + bounds.yMax) / 2;
    const zCenter = (bounds.zMin + bounds.zMax) / 2;
    const maxRange = Math.max(bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin, bounds.zMax - bounds.zMin);
    
    camera.position.set(
      xCenter + maxRange * 1.2,
      zCenter + maxRange * 0.8,
      yCenter + maxRange * 1.2
    );
    
    if (controlsRef.current) {
      controlsRef.current.target.set(xCenter, zCenter, yCenter);
      controlsRef.current.update();
    }
  }, [bounds, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

export function RiskSurfaceCanvas(props: RiskSurfaceCanvasProps) {
  const { surfaceData, bounds } = props;
  const flatPoints = surfaceData.flat();

  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #0B1E3F 0%, #0F172A 100%)' }}
    >
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
      <CameraController bounds={bounds} />
      
      <fog attach="fog" args={['#0B1E3F', 20, 60]} />
      
      <SceneLights />
      <AxesGrid bounds={bounds} />
      
      <RiskSurfaceMesh
        surfaceData={surfaceData}
        bounds={bounds}
        highlightedRegion={props.highlightedRegion}
        onPointClick={props.onPointClick}
      />
      
      <SurfacePoints
        points={flatPoints}
        holdings={props.holdings}
        onPointClick={props.onPointClick}
        selectedBondId={props.selectedBondId}
      />
      
      <AnnotationsLayer
        annotations={props.annotations}
        onRemove={props.onAnnotationRemove}
      />
      
      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
