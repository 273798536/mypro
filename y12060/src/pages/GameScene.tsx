import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useForkliftControls } from '../hooks/useForkliftControls';
import { useCollisionDetection } from '../hooks/useCollisionDetection';
import { useRouteRecorder } from '../hooks/useRouteRecorder';
import { Warehouse } from '../three/Warehouse';
import { Forklift } from '../three/Forklift';
import { ShelfInstanced } from '../three/Shelf';
import { RouteLine } from '../three/RouteLine';
import { HUD } from '../components/HUD';
import { ControlPanel } from '../components/ControlPanel';
import { SHELF_LAYOUTS } from '../config/shelves';
import { LEVELS } from '../config/levels';
import { CameraView } from '../types/game';

function CameraController({ cameraView, forkliftPosition }: { cameraView: CameraView; forkliftPosition: { x: number; y: number; z: number } }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  useFrame(() => {
    if (!controlsRef.current) return;
    
    const fp = forkliftPosition;
    
    switch (cameraView) {
      case 'first':
        camera.position.set(fp.x, 1.5, fp.z);
        controlsRef.current.target.set(fp.x, 1.5, fp.z - 5);
        break;
      case 'third':
        camera.position.set(fp.x, fp.y + 4, fp.z + 8);
        controlsRef.current.target.set(fp.x, fp.y + 1, fp.z);
        break;
      case 'top':
        camera.position.set(fp.x, 25, fp.z);
        controlsRef.current.target.set(fp.x, 0, fp.z);
        break;
    }
    
    controlsRef.current.update();
  });
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2 - 0.1}
    />
  );
}

interface GameScene3DProps {
  forkliftControls: ReturnType<typeof useForkliftControls>;
}

function GameScene3D({ forkliftControls }: GameScene3DProps) {
  const session = useGameStore(state => state.session);
  const selectedForklift = session.selectedForklift;
  const shelves = SHELF_LAYOUTS[session.selectedShelfConfig] || [];
  const violations = session.violations;
  const routePoints = session.route;
  
  const isPlaying = session.status === 'playing' || session.status === 'paused';
  const isPaused = session.status === 'paused';
  
  const {
    position,
    rotation,
    speed,
    steeringAngle,
    forkHeight,
    resetPosition
  } = forkliftControls;
  
  useCollisionDetection({
    position,
    speed,
    forkHeight,
    forklift: selectedForklift,
    shelves,
    isPlaying: isPlaying && !isPaused
  });
  
  useRouteRecorder({
    position,
    rotation,
    speed,
    forkHeight,
    isPlaying,
    isPaused
  });
  
  const currentLevel = LEVELS.find(l => l.shelfLayout === session.selectedShelfConfig);
  const targetCargoPosition = currentLevel?.targetPosition || { x: 10, z: -10 };
  
  useEffect(() => {
    const distanceToTarget = Math.sqrt(
      Math.pow(position.x - targetCargoPosition.x, 2) +
      Math.pow(position.z - targetCargoPosition.z, 2)
    );
    
    if (distanceToTarget < 2 && isPlaying && !isPaused) {
      const finishGame = useGameStore.getState().finishGame;
      finishGame();
    }
  }, [position, targetCargoPosition, isPlaying, isPaused]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const state = useGameStore.getState();
      
      if (key === 'p') {
        if (session.status === 'playing') {
          state.pauseGame();
        } else if (session.status === 'paused') {
          state.resumeGame();
        }
      }
      
      if (key === 'r') {
        if (window.confirm('确定要重新开始吗？当前进度将丢失。')) {
          state.restartGame();
          resetPosition();
        }
      }
      
      if (key === 'v') {
        const views: CameraView[] = ['third', 'first', 'top'];
        const currentIndex = views.indexOf(session.cameraView);
        const nextIndex = (currentIndex + 1) % views.length;
        state.setCameraView(views[nextIndex]);
      }
      
      if (key === 'escape') {
        if (session.status === 'playing') {
          state.pauseGame();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.status, session.cameraView, resetPosition]);
  
  const collisionPoints = useMemo(() => {
    return violations
      .filter(v => v.type === 'shelf')
      .map(v => ({
        position: v.position,
        timestamp: v.timestamp
      }));
  }, [violations]);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 15]} fov={60} />
      <CameraController cameraView={session.cameraView} forkliftPosition={position} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      
      <fog attach="fog" args={['#1a1a2e', 20, 60]} />
      
      <Warehouse size={50} />
      <ShelfInstanced shelves={shelves} showBlindZone={true} />
      
      {routePoints.length > 1 && (
        <RouteLine 
          points={routePoints} 
          violations={violations}
          showMarkers={true}
        />
      )}
      
      <mesh position={[targetCargoPosition.x, 0.1, targetCargoPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.8} />
      </mesh>
      <mesh position={[targetCargoPosition.x, 0.11, targetCargoPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.2} />
      </mesh>
      
      {selectedForklift && (
        <Forklift
          position={[position.x, position.y, position.z]}
          rotation={rotation}
          forkHeight={forkHeight}
          forklift={selectedForklift}
        />
      )}
    </>
  );
}

export function GameScene() {
  const navigate = useNavigate();
  const session = useGameStore(state => state.session);
  const resetSession = useGameStore(state => state.resetSession);
  
  const [showStartCountdown, setShowStartCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  
  const isPlaying = session.status === 'playing' || session.status === 'paused';
  const isPaused = session.status === 'paused';
  
  const forkliftControls = useForkliftControls(
    session.selectedForklift, 
    session.difficulty, 
    isPlaying && !isPaused && !showStartCountdown
  );
  
  const { speed, forkHeight, steeringAngle, resetPosition } = forkliftControls;
  
  useEffect(() => {
    if (session.status === 'finished') {
      navigate('/settlement');
    }
  }, [session.status, navigate]);
  
  useEffect(() => {
    if (!session.selectedForklift || session.selectedShelfConfig === '') {
      navigate('/');
    }
  }, [session.selectedForklift, session.selectedShelfConfig, navigate]);
  
  useEffect(() => {
    if (!showStartCountdown) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowStartCountdown(false);
    }
  }, [countdown, showStartCountdown]);
  
  if (!session.selectedForklift) return null;
  
  return (
    <div className="w-full h-screen bg-gray-900 relative overflow-hidden">
      <Canvas shadows gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#1a1a2e']} />
        <GameScene3D forkliftControls={forkliftControls} />
      </Canvas>
      
      {showStartCountdown ? (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-9xl font-bold text-orange-500 animate-pulse mb-4">
              {countdown || 'GO!'}
            </div>
            <div className="text-2xl text-gray-300">
              {countdown ? '准备开始...' : '出发！将货物运送到绿色标记位置'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <HUD
            speed={speed}
            forkHeight={forkHeight}
            steeringAngle={steeringAngle}
          />
          <ControlPanel />
        </>
      )}
      
      <div className="absolute top-4 left-4 z-30">
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
          <div className="text-xs text-gray-400">当前叉车</div>
          <div className="text-sm font-bold text-white">{session.selectedForklift.name}</div>
        </div>
      </div>
      
      {session.status === 'finished' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-6xl font-bold text-green-500 mb-4">✓ 任务完成！</div>
            <div className="text-2xl text-gray-300 mb-8">正在生成结算报告...</div>
          </div>
        </div>
      )}
    </div>
  );
}
