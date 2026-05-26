import { useNavigate } from 'react-router-dom';
import { gameLevels } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { BookOpen, Trophy, Clock, Star } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { highScores } = useGameStore();

  const handleStartGame = (levelId: number) => {
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-700 rounded-full mb-6 shadow-lg">
            <BookOpen className="text-amber-100" size={40} />
          </div>
          <h1 className="text-4xl font-bold text-amber-900 mb-3">书店退货整理赛</h1>
          <p className="text-amber-700 text-lg">通过游戏学习正确的退货处理流程</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-amber-600" size={24} />
              <h3 className="font-semibold text-amber-900">限时挑战</h3>
            </div>
            <p className="text-amber-700 text-sm">在规定时间内完成整理任务</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Star className="text-amber-600" size={24} />
              <h3 className="font-semibold text-amber-900">即时反馈</h3>
            </div>
            <p className="text-amber-700 text-sm">操作对错即时获得提示和建议</p>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="text-amber-600" size={24} />
              <h3 className="font-semibold text-amber-900">回放分析</h3>
            </div>
            <p className="text-amber-700 text-sm">详细回放错误操作，帮助改进</p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-amber-900 mb-4">选择关卡</h2>
          <div className="space-y-4">
            {gameLevels.map(level => {
              const highScore = highScores[level.id];
              
              return (
                <div
                  key={level.id}
                className="flex items-center justify-between p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  <div>
                  <div className="flex items-center gap-3">
                    <span className="text-amber-800 font-semibold">第{level.id}关</span>
                    <span className="text-amber-900 font-bold">{level.name}</span>
                  </div>
                    <p className="text-amber-600 text-sm mt-1">{level.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {highScore !== undefined && (
                    <div className="text-right">
                      <div className="text-amber-600 text-xs">最高分</div>
                      <div className="text-amber-900 font-bold">{highScore}</div>
                    </div>
                  )}
                    <div className="text-right">
                      <div className="text-amber-600 text-xs">{level.itemCount}本书</div>
                      <div className="text-amber-900 font-bold">{level.timeLimit}秒</div>
                    </div>
                    <Button
                      onClick={() => handleStartGame(level.id)}
                      size="sm"
                    >
                      开始
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

        <div className="mt-8 bg-amber-700 rounded-xl p-4 text-center">
          <p className="text-amber-100 text-sm">
            提示：拖拽书籍到正确的区域，注意区分退货区、破损登记区、预订保留区和对应书架。
          </p>
        </div>
      </div>
    </div>
  );
}
