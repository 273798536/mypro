import { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { GameCanvas } from '@/components/game/GameCanvas';
import { ControlPanel } from '@/components/game/ControlPanel';
import { StatusBar } from '@/components/game/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Home, RotateCcw, ArrowRight, Trophy, XCircle } from 'lucide-react';
import { getTotalLevels } from '@/data/levels';

interface GamePageProps {
  onNavigate: (page: 'start' | 'result' | 'history') => void;
}

export function GamePage({ onNavigate }: GamePageProps) {
  const {
    status,
    currentLevel,
    startLevel,
    resetGame,
    score,
    lives
  } = useGameStore();

  useEffect(() => {
    if (status === 'gameOver' || status === 'allComplete') {
      const timer = setTimeout(() => {
        onNavigate('result');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onNavigate]);

  const handleNextLevel = () => {
    const nextLevel = currentLevel + 1;
    if (nextLevel <= getTotalLevels()) {
      startLevel(nextLevel);
    }
  };

  const handleRestart = () => {
    resetGame();
    onNavigate('start');
  };

  const isGameActive = status === 'playing';
  const isLevelComplete = status === 'levelComplete';
  const isGameOver = status === 'gameOver';
  const isAllComplete = status === 'allComplete';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleRestart}>
            <Home className="w-5 h-5 mr-2" />
            返回主页
          </Button>
          <h1 className="text-2xl font-bold text-white">数学函数攀岩</h1>
          <Button variant="ghost" onClick={() => onNavigate('history')}>
            历史记录
          </Button>
        </div>

        <StatusBar />

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="aspect-[4/3] min-h-[400px]">
              <GameCanvas />
            </div>
          </div>

          <div className="space-y-4">
            {isGameActive && <ControlPanel />}

            {isLevelComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-400">
                    <Trophy className="w-6 h-6" />
                    关卡完成！
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">
                    恭喜通过第 {currentLevel} 关！
                  </p>
                  <p className="text-2xl font-bold text-cyan-400">
                    当前得分：{score}
                  </p>
                  <div className="flex gap-3">
                    {currentLevel < getTotalLevels() && (
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={handleNextLevel}
                      >
                        <ArrowRight className="w-5 h-5 mr-2" />
                        下一关
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={handleRestart}
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      重新开始
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isGameOver && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-6 h-6" />
                    游戏结束
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">
                    生命值耗尽，挑战失败！
                  </p>
                  <p className="text-2xl font-bold text-cyan-400">
                    最终得分：{score}
                  </p>
                  <p className="text-slate-400">
                    正在跳转到结算页面...
                  </p>
                </CardContent>
              </Card>
            )}

            {isAllComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="w-6 h-6" />
                    全部通关！
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300">
                    恭喜你完成了所有关卡！
                  </p>
                  <p className="text-2xl font-bold text-cyan-400">
                    最终得分：{score}
                  </p>
                  <p className="text-slate-400">
                    正在跳转到结算页面...
                  </p>
                </CardContent>
              </Card>
            )}

            {!isGameActive && !isLevelComplete && !isGameOver && !isAllComplete && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-slate-400 text-center">
                    游戏正在加载...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
