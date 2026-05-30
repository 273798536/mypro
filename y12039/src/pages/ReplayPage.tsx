import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ArrowLeft, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReplayPage: React.FC = () => {
  const { snapshots, decisions } = useGameStore();
  const navigate = useNavigate();
  
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const playRef = React.useRef<number | null>(null);

  const currentSnapshot = snapshots[currentIndex];

  React.useEffect(() => {
    if (isPlaying && currentIndex < snapshots.length - 1) {
      playRef.current = window.setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 200);
    } else if (currentIndex >= snapshots.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [isPlaying, currentIndex, snapshots.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDecisionAtTime = (timestamp: number) => {
    return decisions.find(d => Math.abs(d.timestamp - timestamp) < 1);
  };

  const currentDecision = currentSnapshot ? getDecisionAtTime(currentSnapshot.timestamp) : null;

  const handlePlayPause = () => {
    if (currentIndex >= snapshots.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  if (snapshots.length === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-8">
        <Card className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-cyber-cyan mb-2">暂无复盘数据</h2>
          <p className="text-gray-400 text-sm mb-6">请先完成一局游戏</p>
          <Button variant="primary" onClick={() => navigate('/game')}>
            返回游戏
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="scanline fixed inset-0 pointer-events-none z-50" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/result')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回结算
          </Button>
          <h1 className="text-2xl font-bold text-cyber-cyan font-orbitron">
            游戏复盘
          </h1>
        </div>
        <div className="text-gray-400 text-sm">
          总时长: {formatTime(snapshots[snapshots.length - 1]?.timestamp || 0)}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1">
        <div className="col-span-8">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-cyber-cyan">时间线回放</h3>
              <div className="text-2xl font-mono text-cyber-cyan">
                {formatTime(currentSnapshot?.timestamp || 0)}
              </div>
            </div>

            <div className="flex-1 relative min-h-[300px] bg-space-dark/50 rounded-lg border border-gray-700 p-4 overflow-hidden">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="space-y-4">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">氧气</div>
                    <div className="text-2xl font-bold" style={{ 
                      color: (currentSnapshot?.resources.oxygen || 0) <= 30 ? '#ff4757' : '#00d4ff' 
                    }}>
                      {(currentSnapshot?.resources.oxygen || 0).toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">电力</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {(currentSnapshot?.resources.power || 0).toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">得分</div>
                    <div className="text-2xl font-bold text-success-green">
                      {currentSnapshot?.score || 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-full">
                  <div className="text-xs text-gray-400 mb-2">任务状态</div>
                  {currentSnapshot?.tasks.map(task => (
                    <div key={task.id} className="p-2 bg-gray-800/30 rounded text-sm flex items-center justify-between">
                      <span className="truncate flex-1">{task.name.slice(0, 15)}...</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        task.status === 'completed' ? 'bg-success-green/20 text-success-green' :
                        task.status === 'in_progress' ? 'bg-cyber-cyan/20 text-cyber-cyan' :
                        task.status === 'failed' ? 'bg-alert-red/20 text-alert-red' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {task.status === 'completed' ? '完成' :
                         task.status === 'in_progress' ? '进行中' :
                         task.status === 'failed' ? '失败' : '待处理'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {currentDecision && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-4 right-4 p-4 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg"
                >
                  <div className="flex items-center gap-2 text-cyber-cyan text-sm mb-1">
                    <Users className="w-4 h-4" />
                    决策记录
                  </div>
                  <p className="text-sm">
                    {currentDecision.type === 'assign' ? '分配' : '调整'}任务给 
                    {currentDecision.staffIds.length}名人员
                    <span className="text-gray-400 ml-2">
                      (效率: {(currentDecision.efficiency * 100).toFixed(0)}%)
                    </span>
                  </p>
                </motion.div>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={snapshots.length - 1}
                  value={currentIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentIndex(parseInt(e.target.value));
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button variant="secondary" size="sm" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant={isPlaying ? 'warning' : 'success'} onClick={handlePlayPause}>
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? '暂停' : '播放'}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setCurrentIndex(Math.min(snapshots.length - 1, currentIndex + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-span-4">
          <Card className="h-full">
            <h3 className="font-bold text-cyber-cyan mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              关键事件
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {decisions.map((decision, index) => (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    Math.abs((currentSnapshot?.timestamp || 0) - decision.timestamp) < 1
                      ? 'border-cyber-cyan bg-cyber-cyan/10'
                      : 'border-gray-700 bg-gray-800/30 hover:border-gray-500'
                  }`}
                  onClick={() => {
                    const idx = snapshots.findIndex(s => s.timestamp >= decision.timestamp);
                    if (idx !== -1) {
                      setIsPlaying(false);
                      setCurrentIndex(idx);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-cyber-cyan font-mono">
                      {formatTime(decision.timestamp)}
                    </span>
                    <span className="text-xs text-success-green">
                      效率 {(decision.efficiency * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm">
                    {decision.type === 'assign' ? '分配' : '调整'}任务给 {decision.staffIds.length} 人
                  </p>
                </motion.div>
              ))}

              {decisions.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  暂无决策记录
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
