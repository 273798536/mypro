import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLevelStore } from '../store';
import { Target, RotateCcw, FileCheck, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const LevelSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { levels, setCurrentLevel, getLevelProgress } = useLevelStore();

  const getLevelIcon = (type: string) => {
    switch (type) {
      case 'boundary_failure':
        return AlertCircle;
      case 'undo_restart':
        return RotateCcw;
      case 'full_settlement':
        return FileCheck;
      default:
        return Target;
    }
  };

  const getLevelColor = (type: string) => {
    switch (type) {
      case 'boundary_failure':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-500',
          border: 'border-red-200',
          gradient: 'from-red-500 to-orange-500',
        };
      case 'undo_restart':
        return {
          bg: 'bg-orange-50',
          icon: 'text-accent-orange',
          border: 'border-orange-200',
          gradient: 'from-orange-500 to-yellow-500',
        };
      case 'full_settlement':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-500',
          border: 'border-green-200',
          gradient: 'from-green-500 to-emerald-500',
        };
      default:
        return {
          bg: 'bg-primary-50',
          icon: 'text-primary-500',
          border: 'border-primary-200',
          gradient: 'from-primary-500 to-blue-500',
        };
    }
  };

  const handleLevelSelect = (levelId: string) => {
    setCurrentLevel(levelId);
    navigate(`/level/${levelId}`);
  };

  const handleViewReport = (levelId: string) => {
    setCurrentLevel(levelId);
    navigate(`/report/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Target className="w-4 h-4" />
            赛事运营工具
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-neutral-800 mb-4">
            二维物理碰撞演示
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            通过模拟真实碰撞场景，练习标注异常、撤销重开和生成结算报告
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {levels.map((level, index) => {
            const Icon = getLevelIcon(level.type);
            const colors = getLevelColor(level.type);
            const progress = getLevelProgress(level.id);
            const isCompleted = !!progress;

            return (
              <Card
                key={level.id}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isCompleted ? 'ring-2 ring-green-300' : ''
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} />

                {isCompleted && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`${colors.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-7 h-7 ${colors.icon}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-neutral-400">
                      关卡 {index + 1}
                    </span>
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        已完成
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold text-neutral-800">
                    {level.name}
                  </h3>
                </CardHeader>

                <CardContent className="pb-4">
                  <p className="text-neutral-600 text-sm mb-4">
                    {level.description}
                  </p>
                  <div className="bg-neutral-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-neutral-500 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-accent-orange flex-shrink-0 mt-0.5" />
                      {level.hint}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-neutral-500">
                      <Clock className="w-4 h-4" />
                      时长：{level.duration}秒
                    </div>
                    <div className="text-neutral-500">
                      目标标注：{level.targetAnnotations}条
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1 gap-2"
                    onClick={() => handleLevelSelect(level.id)}
                  >
                    {isCompleted ? '重新练习' : '开始练习'}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {isCompleted && (
                    <Button
                      variant="secondary"
                      onClick={() => handleViewReport(level.id)}
                    >
                      查看报告
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-display text-lg font-semibold text-neutral-800 mb-4">使用说明</h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-neutral-600">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary-600">1</span>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">观察碰撞</p>
                <p>播放物理模拟，仔细观察球体运动和碰撞过程</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary-600">2</span>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">标注异常</p>
                <p>点击球体添加标注，记录边界误判、漏标等异常情况</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-primary-600">3</span>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">生成报告</p>
                <p>完成标注后生成结算报告，可导出分享给同事</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-neutral-500">
          <p>提示：报告中的追溯链路可以从异常一直回查到标注草稿和处理意见</p>
        </div>
      </div>
    </div>
  );
};

export default LevelSelectPage;
