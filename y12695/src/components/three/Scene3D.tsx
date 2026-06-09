import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import PoreModel from "./PoreModel";
import CutPlane from "./CutPlane";
import OutlierLayer from "./OutlierLayer";
import BoundaryBox from "./BoundaryBox";
import type { Scene, CutAxis } from "@/types";
import { checkCutPlaneCollision } from "@/utils/collision";
import { useReviewStore } from "@/stores/reviewStore";

interface Scene3DProps {
  scene: Scene;
  cutX: number;
  cutY: number;
  cutZ: number;
  activeAxis: CutAxis;
}

export interface Scene3DHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

function SceneInner({ scene, cutX, cutY, cutZ, activeAxis }: Scene3DProps) {
  const setLastCollision = useReviewStore((s) => s.setLastCollision);
  const highlightedRecordId = useReviewStore((s) => s.highlightedRecordId);
  const selectedOutlierId = useReviewStore((s) => s.selectedOutlierId);
  const setSelectedOutlierId = useReviewStore((s) => s.setSelectedOutlierId);
  const activeCutValue = activeAxis === "x" ? cutX : activeAxis === "y" ? cutY : cutZ;

  useEffect(() => {
    const result = checkCutPlaneCollision(scene, activeAxis, activeCutValue);
    setLastCollision(result);
  }, [scene, activeAxis, activeCutValue, setLastCollision]);

  const collision = useReviewStore((s) => s.lastCollision);
  const crossedPoreIds = new Set(collision?.crossedPores || []);
  const crossedOutlierIds = new Set(collision?.crossedOutliers || []);
  const isCrossed = collision?.isCrossed || false;

  const highlightedPore = highlightedRecordId
    ? scene.pores.find((_, i) => i === Number(highlightedRecordId.replace(/\D/g, "")) % scene.pores.length)?.id || null
    : null;

  return (
    <>
      <color attach="background" args={["#0A1A2E"]} />
      <fog attach="fog" args={["#0A1A2E", 18, 38]} />

      <ambientLight intensity={0.35} color="#cfe3ff" />
      <directionalLight position={[8, 12, 6]} intensity={0.8} color="#e8f1ff" />
      <directionalLight position={[-6, 4, -8]} intensity={0.35} color="#D4A853" />
      <pointLight position={[0, -6, 0]} intensity={0.3} color="#6366f1" distance={30} />

      <Stars radius={60} depth={40} count={800} factor={2.5} fade speed={0.4} />

      <BoundaryBox boundary={scene.boundary} />
      <PoreModel pores={scene.pores} crossedIds={crossedPoreIds} highlightedId={highlightedPore} />
      <OutlierLayer
        outliers={scene.outliers}
        crossedIds={crossedOutlierIds}
        selectedId={selectedOutlierId}
        onSelect={setSelectedOutlierId}
      />

      <CutPlane axis={activeAxis} value={activeCutValue} boundary={scene.boundary} isCrossed={isCrossed} />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={6}
        maxDistance={32}
        target={[0, 0, 0]}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.25} luminanceSmoothing={0.9} height={300} intensity={0.8} />
      </EffectComposer>
    </>
  );
}

function CanvasExposer({ canvasRef }: { canvasRef: React.MutableRefObject<HTMLCanvasElement | null> }) {
  const { gl } = useThree();
  useEffect(() => {
    canvasRef.current = gl.domElement;
  }, [gl, canvasRef]);
  return null;
}

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(function Scene3D(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  return (
    <Canvas
      camera={{ position: [12, 10, 14], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
      dpr={[1, 2]}
    >
      <CanvasExposer canvasRef={canvasRef} />
      <SceneInner {...props} />
    </Canvas>
  );
});

export default Scene3D;
