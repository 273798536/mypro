import { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Home, FileText, ChevronRight, AlertTriangle, Award, Clock, TrendingDown, MapPin, Eye } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Warehouse } from '../three/Warehouse';
import { ShelfInstanced } from '../three/Shelf';
import { RouteLine, ReplayForklift } from '../three/RouteLine';
import { ViolationCard } from '../components/ViolationCard';
import { SHELF_LAYOUTS } from '../config/shelves';
import { formatTime } from '../utils/collision';
import { DIFFICULTY_CONFIG, GAME_MODES } from '../config/levels';
import { CollisionRecord, RoutePoint } from '../types/game';

interface ReplaySceneProps {
  routePoints: RoutePoint[];
  violations: CollisionRecord[];
  currentTime: number;
  forklift: any;
  shelves: any[];
  isPlaying: boolean;
}

function ReplayScene({ routePoints, violations, currentTime, forklift, shelves, isPlaying }: ReplaySceneProps) {
  const controlsRef = useRef<any>(null);
  
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 15, 20]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={60}
      />
      
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      
      <fog attach="fog" args={['#1a1a2e', 25, 70]} />
      
      <Warehouse size={50} />
      <ShelfInstanced shelves={shelves} showBlindZone={true} />
      
      {routePoints.length > 1 && (
        <RouteLine
          points={routePoints}
          violations={violations}
          showMarkers={true}
          currentTime={currentTime}
        />
      )}
      
      {routePoints.length > 0 && forklift && (
        <ReplayForklift
          points={routePoints}
          currentTime={currentTime}
          forklift={forklift}
        />
      )}
    </>
  );
}

export function Settlement() {
  const navigate = useNavigate();
  const session = useGameStore(state => state.session);
  const resetSession = useGameStore(state => state.resetSession);
  const restartGame = useGameStore(state => state.restartGame);
  
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentReplayTime, setCurrentReplayTime] = useState(0);
  const [selectedViolation, setSelectedViolation] = useState<CollisionRecord | null>(null);
  
  const shelves = SHELF_LAYOUTS[session.selectedShelfConfig] || [];
  const routePoints = session.route;
  const violations = session.violations;
  const totalDuration = routePoints.length > 0 
    ? routePoints[routePoints.length - 1].timestamp 
    : 0;
  
  const shelfViolations = violations.filter(v => v.type === 'shelf');
  const overheightViolations = violations.filter(v => v.type === 'overheight');
  const blindzoneViolations = violations.filter(v => v.type === 'blindzone');
  
  const scorePercentage = session.score.maxPossible > 0 
    ? (session.score.total / session.score.maxPossible) * 100 
    : 0;
  
  const getGrade = () => {
    if (scorePercentage >= 90) return { grade: 'S', color: 'text-purple-400', bg: 'bg-purple-500/20', label: '优秀' };
    if (scorePercentage >= 80) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-500/20', label: '良好' };
    if (scorePercentage >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20', label: '合格' };
    if (scorePercentage >= 60) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '需改进' };
    return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/20', label: '不合格' };
  };
  
  const gradeInfo = getGrade();
  const modeInfo = GAME_MODES.find(m => m.id === session.mode);
  const difficultyConfig = DIFFICULTY_CONFIG[session.difficulty];
  
  const actualDuration = session.startTime && session.endTime 
    ? session.endTime - session.startTime - session.totalPauseDuration 
    : totalDuration;
  
  useEffect(() => {
    if (session.status !== 'finished' || !session.selectedForklift) {
      navigate('/');
    }
  }, [session.status, session.selectedForklift, navigate]);
  
  useEffect(() => {
    if (!isReplaying) return;
    
    const interval = setInterval(() => {
      setCurrentReplayTime(prev => {
        if (prev >= totalDuration) {
          setIsReplaying(false);
          return totalDuration;
        }
        return prev + 50;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [isReplaying, totalDuration]);
  
  const handleViolationClick = (violation: CollisionRecord) => {
    setSelectedViolation(violation);
    setCurrentReplayTime(violation.timestamp - 1000);
    setIsReplaying(false);
  };
  
  const handleRestart = () => {
    restartGame();
    navigate('/game');
  };
  
  const handleViewReport = () => {
    navigate('/report');
  };
  
  const handleBackToMenu = () => {
    resetSession();
    navigate('/');
  };
  
  const progress = totalDuration > 0 ? (currentReplayTime / totalDuration) * 100 : 0;
  
  if (!session.selectedForklift) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
            训练结算
          </h1>
          <p className="text-gray-400">
            {modeInfo?.name} · {difficultyConfig.label}难度
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${gradeInfo.bg} mb-4`}>
                  <span className={`text-5xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                </div>
                <div className="text-xl font-bold mb-1">{gradeInfo.label}</div>
                <div className="text-sm text-gray-400">综合评级</div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-400" />
                    <span className="text-gray-300">最终得分</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{session.score.total}</div>
                    <div className="text-xs text-gray-500">/ {session.score.maxPossible}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">完成用时</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatTime(actualDuration)}
                  </div>
                </div>
                
                {session.score.timeBonus > 0 && (
                  <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-green-400" />
                      <span className="text-gray-300">时间奖励</span>
                    </div>
                    <div className="text-xl font-bold text-green-400">
                      +{session.score.timeBonus}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                扣分详情
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">货架碰撞</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">-{session.score.collisionPenalties}</span>
                    <span className="text-xs text-gray-500">({shelfViolations.length}次)</span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${session.score.collisionPenalties > 0 ? Math.min(100, session.score.collisionPenalties / 5) : 0}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">超高装载</span>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">-{session.score.overheightPenalties}</span>
                    <span className="text-xs text-gray-500">({overheightViolations.length}次)</span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-500"
                    style={{ width: `${session.score.overheightPenalties > 0 ? Math.min(100, session.score.overheightPenalties / 3) : 0}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">盲区穿行</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold">-{session.score.blindzonePenalties}</span>
                    <span className="text-xs text-gray-500">({blindzoneViolations.length}次)</span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{ width: `${session.score.blindzonePenalties > 0 ? Math.min(100, session.score.blindzonePenalties / 4) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                使用车辆
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">车型</span>
                  <span className="text-white font-medium">{session.selectedForklift.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">维护人</span>
                  <span className="text-white font-medium">{session.selectedForklift.maintainer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">货架布局</span>
                  <span className="text-white font-medium">
                    {session.selectedShelfConfig === 'basic' ? '基础布局' : 
                     session.selectedShelfConfig === 'narrow' ? '窄通道布局' : '复杂布局'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
              <div className="h-96 relative">
                <Canvas shadows gl={{ antialias: true }}>
                  <color attach="background" args={['#1a1a2e']} />
                  <ReplayScene
                    routePoints={routePoints}
                    violations={violations}
                    currentTime={currentReplayTime}
                    forklift={session.selectedForklift}
                    shelves={shelves}
                    isPlaying={isReplaying}
                  />
                </Canvas>
                
                <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300">路线回放</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-900/50 border-t border-gray-700">
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => setIsReplaying(!isReplaying)}
                    className="p-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                  >
                    {isReplaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentReplayTime(0);
                      setIsReplaying(false);
                    }}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="重新播放"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max={totalDuration}
                      value={currentReplayTime}
                      onChange={(e) => {
                        setCurrentReplayTime(Number(e.target.value));
                        setIsReplaying(false);
                      }}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-400 min-w-[120px] text-right">
                    {formatTime(currentReplayTime)} / {formatTime(totalDuration)}
                  </div>
                </div>
                
                <div className="relative h-8">
                  {shelfViolations.map((v, i) => (
                    <div
                      key={v.id}
                      className="absolute top-0 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 cursor-pointer hover:scale-150 transition-transform"
                      style={{ left: `${(v.timestamp / totalDuration) * 100}%` }}
                      title={`货架碰撞 #${i + 1} - ${formatTime(v.timestamp)}`}
                      onClick={() => handleViolationClick(v)}
                    />
                  ))}
                  {overheightViolations.map((v, i) => (
                    <div
                      key={v.id}
                      className="absolute top-0 w-3 h-3 bg-yellow-500 rounded-full transform -translate-x-1/2 cursor-pointer hover:scale-150 transition-transform"
                      style={{ left: `${(v.timestamp / totalDuration) * 100}%` }}
                      title={`超高装载 #${i + 1} - ${formatTime(v.timestamp)}`}
                      onClick={() => handleViolationClick(v)}
                    />
                  ))}
                  {blindzoneViolations.map((v, i) => (
                    <div
                      key={v.id}
                      className="absolute top-0 w-3 h-3 bg-orange-500 rounded-full transform -translate-x-1/2 cursor-pointer hover:scale-150 transition-transform"
                      style={{ left: `${(v.timestamp / totalDuration) * 100}%` }}
                      title={`盲区穿行 #${i + 1} - ${formatTime(v.timestamp)}`}
                      onClick={() => handleViolationClick(v)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">违规记录 ({violations.length})</h3>
              
              {violations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Award className="w-16 h-16 mx-auto mb-4 text-green-400 opacity-50" />
                  <p>太棒了！本次训练没有任何违规记录</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {violations.map((violation) => (
                    <ViolationCard
                      key={violation.id}
                      violation={violation}
                      isSelected={selectedViolation?.id === violation.id}
                      onClick={() => handleViolationClick(violation)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleBackToMenu}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
              >
                <Home className="w-5 h-5" />
                返回主菜单
              </button>
              
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                再来一次
              </button>
              
              <button
                onClick={handleViewReport}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold transition-all"
              >
                <FileText className="w-5 h-5" />
                查看安全报告
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
