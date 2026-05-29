import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { COLORS } from '@/utils/colors';
import { useAppStore } from '@/store/useAppStore';
import { Starfield } from './Starfield';
import { ForceGraph } from './ForceGraph';

function AutoRotate() {
  const { autoRotate } = useAppStore();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current && autoRotate) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.5;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={200}
      enablePan={true}
    />
  );
}

function SceneContent() {
  const { filteredNodes, filteredEdges, selectedNodeId, selectedEdgeId, highlightedNodeIds, highlightedEdgeIds } = useAppStore();
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 50, 80);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const selectedIds = new Set<string>();
  if (selectedNodeId) selectedIds.add(selectedNodeId);
  if (selectedEdgeId) selectedIds.add(selectedEdgeId);
  highlightedNodeIds.forEach(id => selectedIds.add(id));
  highlightedEdgeIds.forEach(id => selectedIds.add(id));

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[50, 50, 50]} intensity={1} color={COLORS.text.primary} />
      <pointLight position={[-50, 30, -50]} intensity={0.5} color={COLORS.node.selected} />
      <pointLight position={[0, -30, 0]} intensity={0.3} color={COLORS.node.low} />

      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Environment preset="night" />

      <Starfield />

      <Grid
        args={[300, 300]}
        cellSize={5}
        cellThickness={0.3}
        cellColor={COLORS.panelBorder}
        sectionSize={25}
        sectionThickness={0.5}
        sectionColor={COLORS.node.selected}
        fadeDistance={200}
        fadeStrength={1}
        followCamera={false}
        position={[0, -20, 0]}
        infiniteGrid
      />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <ForceGraph nodes={filteredNodes} edges={filteredEdges} />

      <AutoRotate />
    </>
  );
}

interface Canvas3DProps {
  className?: string;
}

export function Canvas3D({ className }: Canvas3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 50, 80], fov: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: COLORS.background }}
        dpr={[1, 2]}
      >
        <fog attach="fog" args={[COLORS.background, 50, 250]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}

export default Canvas3D;
