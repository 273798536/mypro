import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, GraduationCap, ClipboardCheck, Zap, ChevronRight, Settings, Truck, Package, Gauge, Ruler, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { FORKLIFTS } from '../config/forklifts';
import { SHELF_LAYOUTS } from '../config/shelves';
import { GAME_MODES, DIFFICULTY_CONFIG, LEVELS } from '../config/levels';
import { checkDataConflicts } from '../utils/conflictCheck';
import { ConflictAlert } from '../components/ConflictAlert';
import { GameMode, Difficulty } from '../types/game';

export function LevelSelect() {
  const navigate = useNavigate();
  const session = useGameStore(state => state.session);
  const setMode = useGameStore(state => state.setMode);
  const setDifficulty = useGameStore(state => state.setDifficulty);
  const setForklift = useGameStore(state => state.setForklift);
  const setShelfConfig = useGameStore(state => state.setShelfConfig);
  const setConflicts = useGameStore(state => state.setConflicts);
  const startGame = useGameStore(state => state.startGame);
  const resetSession = useGameStore(state => state.resetSession);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const selectedForklift = session.selectedForklift;
  const selectedShelfConfig = session.selectedShelfConfig;
  const currentShelves = SHELF_LAYOUTS[selectedShelfConfig] || [];
  
  useEffect(() => {
    if (selectedForklift && currentShelves.length > 0) {
      const levelConfig = LEVELS.find(l => l.shelfLayout === selectedShelfConfig);
      const conflicts = checkDataConflicts(selectedForklift, currentShelves, {
        cargoWeight: levelConfig?.cargoWeight || 1000
      });
      setConflicts(conflicts);
    }
  }, [selectedForklift, selectedShelfConfig, currentShelves, setConflicts]);
  
  useEffect(() => {
    resetSession();
  }, [resetSession]);
  
  const handleModeSelect = (mode: GameMode) => {
    setMode(mode);
  };
  
  const handleDifficultySelect = (difficulty: Difficulty) => {
    setDifficulty(difficulty);
  };
  
  const handleForkliftSelect = (forklift: typeof FORKLIFTS[0]) => {
    setForklift(forklift);
  };
  
  const handleShelfConfigSelect = (configId: string) => {
    setShelfConfig(configId);
  };
  
  const handleStartGame = () => {
    if (!selectedForklift) {
      alert('请选择叉车类型');
      return;
    }
    
    const hasDangerConflict = session.conflicts.some(c => c.riskLevel === 'danger');
    if (hasDangerConflict) {
      if (!window.confirm('检测到危险级别的参数冲突，强烈建议先解决后再开始训练。确定要继续吗？')) {
        return;
      }
    }
    
    startGame();
    navigate('/game');
  };
  
  const getModeIcon = (iconName: string) => {
    switch (iconName) {
      case 'GraduationCap': return GraduationCap;
      case 'ClipboardCheck': return ClipboardCheck;
      default: return Play;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-full px-6 py-2 mb-6">
            <Truck className="w-6 h-6 text-orange-400" />
            <span className="text-orange-400 font-medium">仓库安全培训系统</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
            3D 仓库叉车赛
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            练习转弯半径、货架高度判断和盲区意识，改掉"只看速度"的坏习惯
          </p>
        </div>
        
        {session.conflicts.length > 0 && (
          <div className="mb-8">
            <ConflictAlert conflicts={session.conflicts} />
          </div>
        )}
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-7 h-7 text-yellow-400" />
            选择训练模式
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {GAME_MODES.map((mode) => {
              const Icon = getModeIcon(mode.icon);
              const isSelected = session.mode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id as GameMode)}
                  className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 text-left ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${mode.color}20` }}>
                    <Icon className="w-7 h-7" style={{ color: mode.color }} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{mode.name}</h3>
                  <p className="text-gray-400 text-sm">{mode.description}</p>
                  {isSelected && (
                    <div className="mt-4 flex items-center gap-2 text-orange-400 text-sm font-medium">
                      <ChevronRight className="w-4 h-4" />
                      已选择
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Settings className="w-7 h-7 text-blue-400" />
            难度设置
          </h2>
          <div className="flex gap-4 flex-wrap">
            {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => {
              const config = DIFFICULTY_CONFIG[diff];
              const isSelected = session.difficulty === diff;
              
              return (
                <button
                  key={diff}
                  onClick={() => handleDifficultySelect(diff)}
                  className={`px-6 py-3 rounded-xl border-2 font-bold transition-all transform hover:scale-105 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <span className="mr-2" style={{ color: config.color }}>●</span>
                  {config.label}
                  <span className="text-sm text-gray-500 ml-2">
                    限速 {config.speedLimit}km/h
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
          高级设置
          <ChevronRight className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>
        
        {showAdvanced && (
          <div className="mb-8 space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Truck className="w-7 h-7 text-orange-400" />
                选择叉车
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {FORKLIFTS.map((forklift) => {
                  const isSelected = selectedForklift?.id === forklift.id;
                  
                  return (
                    <button
                      key={forklift.id}
                      onClick={() => handleForkliftSelect(forklift)}
                      className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 text-left ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <h3 className="text-lg font-bold mb-4">{forklift.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Gauge className="w-4 h-4" /> 转弯半径
                          </span>
                          <span className="text-white font-medium">{forklift.turnRadius}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Ruler className="w-4 h-4" /> 最大高度
                          </span>
                          <span className="text-white font-medium">{forklift.maxHeight}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Package className="w-4 h-4" /> 最大载重
                          </span>
                          <span className="text-white font-medium">{forklift.maxLoad}kg</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="text-xs text-gray-500">维护人: {forklift.maintainer}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Package className="w-7 h-7 text-green-400" />
                选择货架布局
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(SHELF_LAYOUTS).map(([id, shelves]) => {
                  const isSelected = selectedShelfConfig === id;
                  const levelConfig = LEVELS.find(l => l.shelfLayout === id);
                  const minAisleWidth = Math.min(...shelves.map(s => s.aisleWidth));
                  const maxHeight = Math.max(...shelves.map(s => s.height));
                  const maintainers = [...new Set(shelves.map(s => s.maintainer))];
                  
                  const layoutNames: Record<string, string> = {
                    basic: '基础布局',
                    narrow: '窄通道布局',
                    complex: '复杂布局'
                  };
                  
                  return (
                    <button
                      key={id}
                      onClick={() => handleShelfConfigSelect(id)}
                      className={`p-6 rounded-2xl border-2 transition-all transform hover:scale-105 text-left ${
                        isSelected
                          ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <h3 className="text-lg font-bold mb-4">{layoutNames[id] || id}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">货架数量</span>
                          <span className="text-white font-medium">{shelves.length} 个</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">最小通道宽度</span>
                          <span className="text-white font-medium">{minAisleWidth}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">最高货架</span>
                          <span className="text-white font-medium">{maxHeight}m</span>
                        </div>
                      </div>
                      {levelConfig && (
                        <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                          <div className="text-xs text-gray-400">推荐关卡</div>
                          <div className="text-sm font-medium text-white">{levelConfig.name}</div>
                        </div>
                      )}
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="text-xs text-gray-500">
                          维护人: {maintainers.join(', ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-center mt-12">
          <button
            onClick={handleStartGame}
            className="group relative px-12 py-5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl font-bold text-xl text-white shadow-2xl shadow-orange-500/30 transform hover:scale-105 transition-all"
          >
            <span className="flex items-center gap-3">
              <Play className="w-7 h-7" />
              开始训练
            </span>
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">货架碰撞检测</h3>
            <p className="text-gray-400 text-sm">实时检测叉车与货架的碰撞，记录位置、速度和严重程度，碰撞一漏掉，后面基本就要返工</p>
          </div>
          
          <div className="p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4">
              <Ruler className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">超高装载检测</h3>
            <p className="text-gray-400 text-sm">监控货叉举升高度，检测是否超过货架限制，超高装载最好能指回具体记录</p>
          </div>
          
          <div className="p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">盲区穿行检测</h3>
            <p className="text-gray-400 text-sm">标记货架盲区范围，检测盲区内的穿行行为和持续时间，盲区穿行最好能指回具体记录</p>
          </div>
        </div>
        
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>快捷键：W/S 前进后退 | A/D 转向 | Q/E 升降货叉 | P 暂停 | R 重开 | V 切换视角</p>
        </div>
      </div>
    </div>
  );
}
