import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Line, Effects } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { formatNumber } from '@/utils/calculations';
import { CriterionNode } from '@/types';

interface CriterionSphereProps {
  node: CriterionNode;
  isSelected: boolean;
  onClick: () => void;
}

function CriterionSphere({ node, isSelected, onClick }: CriterionSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scale = isSelected ? 1.3 : 1;

  useFrame((state) => {
    if (meshRef.current) {
      if (node.hasError) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
        meshRef.current.scale.setScalar(scale * pulse);
      } else if (isSelected) {
        const float = Math.sin(state.clock.elapsedTime * 2) * 0.1;
        meshRef.current.position.y = node.position[1] + float;
      }
    }
  });

  const color = node.hasError ? '#EF4444' : node.color;
  const emissive = isSelected || node.hasError ? color : '#000000';
  const emissiveIntensity = isSelected ? 0.5 : node.hasError ? 0.3 : 0;

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        scale={scale}
      >
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <Html
        position={[0, 0.7, 0]}
        center
        distanceFactor={10}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="text-center whitespace-nowrap">
          <div className="text-white font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {node.symbol}
          </div>
          <div className="text-gray-300 text-xs mt-0.5">
            {formatNumber(node.value)}
          </div>
        </div>
      </Html>
      <Html
        position={[0, -0.7, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className="text-gray-400 text-xs text-center whitespace-nowrap">
          {node.name}
        </div>
      </Html>
    </group>
  );
}

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  hasError?: boolean;
}

function ConnectionLine({ start, end, hasError }: ConnectionLineProps) {
  const points = useMemo(() => {
    const mid = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 0.5,
      (start[2] + end[2]) / 2,
    ];
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...(mid as [number, number, number])),
      new THREE.Vector3(...end),
    ];
  }, [start, end]);

  return (
    <Line
      points={points}
      color={hasError ? '#EF4444' : '#475569'}
      lineWidth={2}
      dashed={!hasError}
      dashSize={0.2}
      gapSize={0.1}
    />
  );
}

function FormulaOverlay() {
  return (
    <Html position={[0, 3.5, 0]} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
      <div className="bg-slate-900/90 border border-slate-600 rounded px-4 py-2">
        <div className="text-blue-400 text-xs mb-1">核心相似准则</div>
        <div className="text-white font-mono text-sm">
          Re = ρvL/μ &nbsp;&nbsp; Ma = v/√(γRT) &nbsp;&nbsp; λ = L<sub>m</sub>/L<sub>r</sub>
        </div>
      </div>
    </Html>
  );
}

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { cameraPosition, cameraTarget, updateCamera } = useStore();
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    targetPos.current.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    targetLookAt.current.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  }, [cameraPosition, cameraTarget]);

  useFrame((state, delta) => {
    if (controlsRef.current) {
      camera.position.lerp(targetPos.current, delta * 3);
      controlsRef.current.target.lerp(targetLookAt.current, delta * 3);
      controlsRef.current.update();
      
      updateCamera(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: controlsRef.current.target.x, y: controlsRef.current.target.y, z: controlsRef.current.target.z }
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={3}
      maxDistance={20}
    />
  );
}

function SceneContent() {
  const { getCriterionNodes, selectedCriterionId, selectCriterion, selectedRecordId, getFilteredRecords } = useStore();
  const nodes = getCriterionNodes();
  const filteredRecords = getFilteredRecords();

  const connections = useMemo(() => {
    const reNode = nodes.find(n => n.id === 're');
    const maNode = nodes.find(n => n.id === 'ma');
    const lambdaNode = nodes.find(n => n.id === 'lambda');
    const rhoNode = nodes.find(n => n.id === 'rho');
    const vNode = nodes.find(n => n.id === 'v');
    const lNode = nodes.find(n => n.id === 'l');

    if (!reNode || !rhoNode || !vNode || !lNode) return [];

    const hasReynoldsError = nodes.some(n => n.id === 're' && n.hasError);
    const hasMachError = nodes.some(n => n.id === 'ma' && n.hasError);
    const hasUnitError = nodes.some(n => n.id === 'lambda' && n.hasError);

    const conns = [
      { start: rhoNode.position, end: reNode.position, hasError: hasReynoldsError },
      { start: vNode.position, end: reNode.position, hasError: hasReynoldsError },
      { start: lNode.position, end: reNode.position, hasError: hasReynoldsError },
    ];

    if (maNode) {
      conns.push({ start: vNode.position, end: maNode.position, hasError: hasMachError });
    }
    if (lambdaNode) {
      conns.push({ start: lNode.position, end: lambdaNode.position, hasError: hasUnitError });
    }

    return conns;
  }, [nodes]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <axesHelper args={[3]} />

      {connections.map((conn, i) => (
        <ConnectionLine key={i} {...conn} />
      ))}

      {nodes.map((node) => (
        <CriterionSphere
          key={node.id}
          node={node}
          isSelected={selectedCriterionId === node.id}
          onClick={() => selectCriterion(node.id)}
        />
      ))}

      <FormulaOverlay />

      <CameraController />

      <Effects>
        <EffectComposer multisampling={8}>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1} />
        </EffectComposer>
      </Effects>
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [6, 5, 6], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0F172A' }}
    >
      <fog attach="fog" args={['#0F172A', 15, 30]} />
      <SceneContent />
    </Canvas>
  );
}
