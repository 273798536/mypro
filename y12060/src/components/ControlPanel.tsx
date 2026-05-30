import { Play, Pause, RotateCcw, Home, Eye, Camera } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import { CameraView } from '../types/game';

export function ControlPanel() {
  const navigate = useNavigate();
  const session = useGameStore(state => state.session);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const restartGame = useGameStore(state => state.restartGame);
  const quitGame = useGameStore(state => state.quitGame);
  const setCameraView = useGameStore(state => state.setCameraView);
  
  const isPaused = session.status === 'paused';
  const isPlaying = session.status === 'playing';
  
  const handleRestart = () => {
    if (window.confirm('确定要重新开始吗？当前进度将丢失。')) {
      restartGame();
    }
  };
  
  const handleQuit = () => {
    if (window.confirm('确定要退出吗？当前进度将丢失。')) {
      quitGame();
      navigate('/');
    }
  };
  
  const cycleCameraView = () => {
    const views: CameraView[] = ['third', 'first', 'top'];
    const currentIndex = views.indexOf(session.cameraView);
    const nextIndex = (currentIndex + 1) % views.length;
    setCameraView(views[nextIndex]);
  };
  
  const getCameraViewLabel = () => {
    switch (session.cameraView) {
      case 'first': return '第一人称';
      case 'third': return '第三人称';
      case 'top': return '俯视图';
      default: return '切换视角';
    }
  };
  
  if (!isPlaying && !isPaused) return null;
  
  return (
    <>
      {isPaused && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-3xl font-bold text-white text-center mb-8">游戏暂停</h2>
            
            <div className="space-y-4">
              <button
                onClick={resumeGame}
                className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105"
              >
                <Play className="w-6 h-6" />
                继续游戏
              </button>
              
              <button
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-3 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105"
              >
                <RotateCcw className="w-6 h-6" />
                重新开始
              </button>
              
              <button
                onClick={cycleCameraView}
                className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105"
              >
                <Camera className="w-6 h-6" />
                {getCameraViewLabel()}
              </button>
              
              <button
                onClick={handleQuit}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105"
              >
                <Home className="w-6 h-6" />
                返回主菜单
              </button>
            </div>
            
            <div className="mt-8 p-4 bg-gray-800 rounded-xl">
              <h3 className="text-lg font-bold text-white mb-3">当前得分</h3>
              <div className="text-4xl font-bold text-center text-orange-400">
                {session.score.total}
                <span className="text-lg text-gray-400 ml-2">分</span>
              </div>
              <div className="mt-3 text-sm text-gray-400 text-center">
                违规次数: {session.violations.length} 次
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute top-4 right-4 z-40">
        <div className="flex gap-2">
          <button
            onClick={cycleCameraView}
            className="p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
            title={getCameraViewLabel()}
          >
            <Eye className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={isPaused ? resumeGame : pauseGame}
            className="p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-green-400" />
            ) : (
              <Pause className="w-5 h-5 text-yellow-400" />
            )}
          </button>
          <button
            onClick={handleRestart}
            className="p-3 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
            title="重新开始 (R)"
          >
            <RotateCcw className="w-5 h-5 text-orange-400" />
          </button>
        </div>
      </div>
    </>
  );
}
