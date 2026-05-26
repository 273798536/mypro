import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/useGameStore';
import { levels } from '../../data/levels';
import { Button } from '../common/Button';
import { Play, Trophy, Info, Map, X, AlertTriangle } from 'lucide-react';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { initGame } = useGameStore();
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleStartGame = () => {
    initGame(selectedLevel);
    navigate('/game');
  };

  const difficultyColors: Record<string, string> = {
    easy: 'bg-dispatch-success/20 text-dispatch-success border-dispatch-success/50',
    medium: 'bg-dispatch-warning/20 text-dispatch-warning border-dispatch-warning/50',
    hard: 'bg-dispatch-danger/20 text-dispatch-danger border-dispatch-danger/50',
  };

  return (
    <div className="min-h-screen bg-dispatch-bg flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="menuGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#menuGrid)" />
          </svg>
        </div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-dispatch-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-dispatch-success/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold font-mono mb-4 bg-gradient-to-r from-dispatch-primary via-dispatch-success to-dispatch-warning bg-clip-text text-transparent">
            公交改线调度局
          </h1>
          <p className="text-dispatch-text-muted text-lg max-w-2xl mx-auto">
            在施工封路和客流高峰中做出正确的调度决策，平衡运营效率与乘客满意度
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => setSelectedLevel(level.id)}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                selectedLevel === level.id
                  ? 'border-dispatch-primary bg-dispatch-primary/10'
                  : 'border-dispatch-border bg-dispatch-panel hover:border-dispatch-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold font-mono">{level.id}</span>
                <span
                  className={`text-xs px-2 py-1 rounded border ${difficultyColors[level.difficulty]}`}
                >
                  {level.difficulty === 'easy' ? '简单' : level.difficulty === 'medium' ? '中等' : '困难'}
                </span>
              </div>
              <h3 className="font-mono font-semibold text-lg mb-2">{level.name}</h3>
              <p className="text-sm text-dispatch-text-muted">{level.description}</p>
              <div className="mt-4 pt-4 border-t border-dispatch-border">
                <div className="flex justify-between text-xs text-dispatch-text-muted">
                  <span>游戏时长: {Math.floor(level.duration / 60)}分钟</span>
                  <span>目标分数: {level.targetScore}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={handleStartGame} className="px-12">
            <Play size={20} className="mr-2" />
            开始游戏
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setShowInstructions(true)}
          >
            <Info size={20} className="mr-2" />
            游戏说明
          </Button>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-dispatch-primary/20 rounded-xl flex items-center justify-center">
              <Map className="text-dispatch-primary" size={24} />
            </div>
            <h4 className="font-mono font-semibold mb-2">地图调度</h4>
            <p className="text-sm text-dispatch-text-muted">实时监控城市公交网络，直观查看线路运行状态</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-dispatch-warning/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-dispatch-warning" size={24} />
            </div>
            <h4 className="font-mono font-semibold mb-2">应急处理</h4>
            <p className="text-sm text-dispatch-text-muted">应对突发封路和客流高峰，快速调整运营方案</p>
          </div>
          <div className="p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-dispatch-success/20 rounded-xl flex items-center justify-center">
              <Trophy className="text-dispatch-success" size={24} />
            </div>
            <h4 className="font-mono font-semibold mb-2">评分回放</h4>
            <p className="text-sm text-dispatch-text-muted">详细的评分明细和操作回放，总结经验提升技能</p>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dispatch-panel border border-dispatch-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="px-6 py-4 border-b border-dispatch-border flex items-center justify-between">
              <h2 className="font-mono font-semibold text-xl">游戏说明</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 hover:bg-dispatch-bg rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-dispatch-text">
              <div>
                <h3 className="font-mono font-semibold text-dispatch-primary mb-2">🎯 游戏目标</h3>
                <p className="text-sm text-dispatch-text-muted">
                  在限定时间内，通过合理调度公交线路，应对各种突发状况，保持高分和高乘客满意度。
                </p>
              </div>
              <div>
                <h3 className="font-mono font-semibold text-dispatch-success mb-2">🎮 操作方式</h3>
                <ul className="text-sm text-dispatch-text-muted space-y-1 list-disc list-inside">
                  <li>点击线路查看详情，进行改线、派车、调整间隔等操作</li>
                  <li>当站点显示红色警告时，表示该站点已封路，需要及时调整线路</li>
                  <li>使用速度控制按钮调整游戏速度</li>
                  <li>空格键可暂停/继续游戏</li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono font-semibold text-dispatch-warning mb-2">⚠️ 异常类型</h3>
                <ul className="text-sm text-dispatch-text-muted space-y-1 list-disc list-inside">
                  <li><span className="text-dispatch-danger">跳站投诉</span>：车辆经过封路站点时产生，扣5分</li>
                  <li><span className="text-dispatch-warning">间隔失衡</span>：同线路车辆间距过大或过小，扣3分</li>
                  <li><span className="text-dispatch-warning">绕行超时</span>：车辆延误超过30秒，扣4分</li>
                  <li><span className="text-dispatch-warning">车辆满载</span>：载客量超过90%，扣3分</li>
                </ul>
              </div>
              <div>
                <h3 className="font-mono font-semibold text-dispatch-primary mb-2">📊 评分规则</h3>
                <ul className="text-sm text-dispatch-text-muted space-y-1 list-disc list-inside">
                  <li>准点率 (30分)：车辆按时到站的比例</li>
                  <li>覆盖率 (20分)：服务站点的比例</li>
                  <li>满意度 (25分)：乘客满意度转换</li>
                  <li>效率 (15分)：绕行额外里程的影响</li>
                  <li>响应速度 (10分)：异常处理速度</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
