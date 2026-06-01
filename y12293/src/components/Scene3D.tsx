import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/appStore';
import { createSolidGeometry, createCurveLine } from '@/utils/geometryUtils';

interface SolidMeshProps {
  color: string;
  hasWarning: boolean;
}

function SolidMesh({ color, hasWarning }: SolidMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { currentFunction, rotationAxis, solidParams, isPlaying, playbackProgress } = useAppStore();

  const geometry = useMemo(() => {
    return createSolidGeometry(
      currentFunction,
      rotationAxis,
      solidParams.slices,
      solidParams.precision
    );
  }, [currentFunction, rotationAxis, solidParams]);

  useFrame((state) => {
    if (meshRef.current && isPlaying) {
      meshRef.current.rotation.y = playbackProgress * Math.PI * 2;
    } else if (meshRef.current && !isPlaying) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  const materialColor = hasWarning ? '#ff4757' : color;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color={materialColor}
        transparent
        opacity={0.85}
        metalness={0.1}
        roughness={0.3}
        side={THREE.DoubleSide}
        emissive={hasWarning ? '#ff4757' : color}
        emissiveIntensity={hasWarning ? 0.2 : 0.1}
      />
    </mesh>
  );
}

function CurveLine() {
  const { currentFunction, solidParams } = useAppStore();

  const points = useMemo(() => {
    const geometry = createCurveLine(currentFunction, solidParams.precision);
    const positions = geometry.attributes.position.array as Float32Array;
    const pointArray: [number, number, number][] = [];
    for (let i = 0; i < positions.length; i += 3) {
      pointArray.push([positions[i], positions[i + 1], positions[i + 2]]);
    }
    return pointArray;
  }, [currentFunction, solidParams.precision]);

  return <Line points={points} color="#00d4ff" lineWidth={2} />;
}

function RotationAxisLine() {
  const { rotationAxis, currentFunction } = useAppStore();
  const hasIssue = currentFunction.domain.isReversed;

  const linePoints = useMemo((): [number, number, number][] => {
    const length = 10;
    if (rotationAxis.axis === 'x') {
      return [
        [-length / 2, rotationAxis.offset, 0],
        [length / 2, rotationAxis.offset, 0]
      ];
    } else {
      return [
        [rotationAxis.offset, -length / 2, 0],
        [rotationAxis.offset, length / 2, 0]
      ];
    }
  }, [rotationAxis]);

  const endPoint = linePoints[1] as [number, number, number];

  return (
    <group>
      <Line points={linePoints} color={hasIssue ? '#ff4757' : '#ff6b6b'} lineWidth={3} />
      <mesh position={endPoint}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshBasicMaterial color={hasIssue ? '#ff4757' : '#ff6b6b'} />
      </mesh>
    </group>
  );
}

function AxesHelper() {
  const axesRef = useRef<THREE.AxesHelper>(null);

  return (
    <group>
      <axesHelper ref={axesRef} args={[5]} />
      <gridHelper args={[10, 10, '#333355', '#222244']} position={[0, -0.01, 0]} />
    </group>
  );
}

function WarningIndicator({ hasWarning }: { hasWarning: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current && hasWarning) {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    }
  });

  if (!hasWarning) return null;

  return (
    <mesh ref={ref} position={[0, 3, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color="#ff4757" transparent opacity={0.8} />
    </mesh>
  );
}

interface Scene3DProps {
  onReady?: (canvas: HTMLCanvasElement) => void;
}

export function Scene3D({ onReady }: Scene3DProps) {
  const { currentFunction, rotationAxis } = useAppStore();
  const hasWarning = currentFunction.domain.isReversed;

  return (
    <div className="w-full h-full relative">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a18', 1);
          if (onReady) onReady(gl.domElement);
        }}
      >
        <PerspectiveCamera makeDefault position={[4, 3, 4]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
        />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#8888ff" />
        <pointLight position={[0, 5, 0]} intensity={0.5} color="#00d4ff" />
        
        <AxesHelper />
        <RotationAxisLine />
        <CurveLine />
        <SolidMesh color={currentFunction.color} hasWarning={hasWarning} />
        <WarningIndicator hasWarning={hasWarning} />
        
        <fog attach="fog" args={['#0a0a18', 8, 20]} />
      </Canvas>
      
      {hasWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-warning-500/20 border border-warning-500 rounded-lg warning-glow">
          <span className="text-warning-400 font-medium">
            ⚠️ 区间反向：{currentFunction.domain.start} → {currentFunction.domain.end}
          </span>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 text-xs text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-red-500"></span>
          <span>旋转轴 ({rotationAxis.axis.toUpperCase()})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-cyan-400"></span>
          <span>函数曲线</span>
        </div>
      </div>
    </div>
  );
}
