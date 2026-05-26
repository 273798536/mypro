import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import type { GameDifficulty } from '@/types';
import { Mountain, Snowflake, Clock, Users, Shield, AlertTriangle } from 'lucide-react';

export const StartPage = () => {
  const navigate = useNavigate();
  const { startGame } = useGameStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal');

  const difficulties: { level: GameDifficulty; label: string; desc: string; color: string }[] = [
    {
      level: 'easy',
      label: '简单模式',
      desc: '3名伤员，充足时间，良好天气',
      color: 'bg-green-500',
    },
    {
      level: 'normal',
      label: '普通模式',
      desc: '5名伤员，标准时间，多变天气',
      color: 'bg-snow-blue-500',
    },
    {
      level: 'hard',
      label: '困难模式',
      desc: '7名伤员，紧张时间，恶劣天气',
      color: 'bg-alert-red-500',
    },
  ];

  const handleStart = () => {
    startGame(selectedDifficulty);
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-snow-blue-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-70"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `snowfall ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
            <Mountain className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 font-display tracking-tight">
            滑雪救援派遣赛
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            成为一名优秀的滑雪巡逻队长，在复杂的雪场环境中快速做出救援决策
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          <Card variant="glass" className="shadow-2xl">
            <CardHeader>
              <h2 className="text-2xl font-bold text-gray-800 font-display">游戏规则</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-snow-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-snow-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">派遣巡逻员</h3>
                    <p className="text-sm text-gray-600">选择空闲的巡逻员，指派他们前往救援伤员</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">装备选择</h3>
                    <p className="text-sm text-gray-600">根据伤情选择正确的救援装备</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">时间压力</h3>
                    <p className="text-sm text-gray-600">在时间耗尽前完成所有救援任务</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">应对警告</h3>
                    <p className="text-sm text-gray-600">处理装备不匹配、路线关闭等突发情况</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" className="shadow-2xl">
            <CardHeader>
              <h2 className="text-2xl font-bold text-gray-800 font-display">选择难度</h2>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {difficulties.map(diff => (
                  <button
                    key={diff.level}
                    onClick={() => setSelectedDifficulty(diff.level)}
                    className={`p-6 rounded-xl border-2 transition-all text-left ${
                      selectedDifficulty === diff.level
                        ? 'border-snow-blue-500 bg-snow-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className={`w-10 h-10 ${diff.color} rounded-lg mb-4`} />
                    <h3 className="font-bold text-gray-800 mb-1">{diff.label}</h3>
                    <p className="text-sm text-gray-600">{diff.desc}</p>
                    {selectedDifficulty === diff.level && (
                      <div className="mt-3 text-sm text-snow-blue-600 font-medium">
                        ✓ 已选择
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button size="lg" onClick={handleStart} className="px-12 py-4 text-lg shadow-2xl">
              <Snowflake className="w-5 h-5 mr-2" />
              开始游戏
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
