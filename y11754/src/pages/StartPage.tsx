import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Mountain, Play, History, BookOpen, ChevronRight, Star, AlertTriangle, Target } from 'lucide-react';
import { levelConfigs } from '@/data/levels';
import { getDifficultyColor, getDifficultyLabel } from '@/math/FunctionGenerator';

interface StartPageProps {
  onNavigate: (page: 'game' | 'history') => void;
}

export function StartPage({ onNavigate }: StartPageProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const { startGame, gameHistory } = useGameStore();

  const handleStartGame = () => {
    const levelToStart = selectedLevel || 1;
    startGame(levelToStart);
    onNavigate('game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <Mountain className="w-16 h-16 text-cyan-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              数学函数攀岩
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            在函数曲线上攀登，挑战你的微积分知识！判断斜率、识别极值点，
            小心不可导点和间断点的陷阱。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card variant="glass">
            <CardHeader>
              <Target className="w-10 h-10 text-green-400 mb-2" />
              <CardTitle>斜率判定</CardTitle>
              <CardDescription>
                判断函数在某点的斜率是正、负、零还是不存在
              </CardDescription>
            </CardHeader>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <Star className="w-10 h-10 text-yellow-400 mb-2" />
              <CardTitle>极值识别</CardTitle>
              <CardDescription>
                找出函数的极大值点和极小值点
              </CardDescription>
            </CardHeader>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
              <CardTitle>特殊挑战</CardTitle>
              <CardDescription>
                应对不可导点和间断点等特殊情况
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  选择关卡
                </CardTitle>
                <CardDescription>
                  共 {levelConfigs.length} 个关卡，难度逐渐递增
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {levelConfigs.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setSelectedLevel(level.id === selectedLevel ? null : level.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedLevel === level.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-white">第 {level.id} 关</span>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: getDifficultyColor(level.difficulty) + '30',
                            color: getDifficultyColor(level.difficulty)
                          }}
                        >
                          {getDifficultyLabel(level.difficulty)}
                        </span>
                      </div>
                      <div className="text-sm text-white font-medium mb-1">{level.name}</div>
                      <div className="text-xs text-slate-400">{level.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleStartGame}
                >
                  <Play className="w-5 h-5" />
                  {selectedLevel ? `开始第 ${selectedLevel} 关` : '从第一关开始'}
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => onNavigate('history')}
                >
                  <History className="w-5 h-5" />
                  历史记录
                  {gameHistory.length > 0 && (
                    <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {gameHistory.length}
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-base">游戏说明</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 space-y-2">
                <p>• 角色沿函数曲线从左向右攀登</p>
                <p>• 在标记点判断斜率或是否为极值点</p>
                <p>• 答对得分，答错扣除生命值</p>
                <p>• 生命值归零则游戏结束</p>
                <p>• 小心不可导点和间断点！</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
