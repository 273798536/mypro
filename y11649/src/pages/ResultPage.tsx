import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Trophy, RotateCcw, FileText, Play, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export const ResultPage = () => {
  const navigate = useNavigate();
  const { report, restartGame, status, difficulty } = useGameStore();

  if (!report) {
    navigate('/');
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getGradeColor = (grade: string): string => {
    const colors: Record<string, string> = {
      S: 'from-yellow-400 to-amber-500',
      A: 'from-green-400 to-emerald-500',
      B: 'from-blue-400 to-sky-500',
      C: 'from-purple-400 to-indigo-500',
      D: 'from-orange-400 to-red-500',
      F: 'from-red-400 to-rose-500',
    };
    return colors[grade] || 'from-gray-400 to-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 mb-6 shadow-2xl">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 font-display">
            {status === 'won' ? '任务完成！' : '时间耗尽'}
          </h1>
          <p className="text-gray-400">
            难度: {difficulty === 'easy' ? '简单' : difficulty === 'normal' ? '普通' : '困难'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card variant="elevated" className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardContent className="text-center py-8">
              <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${getGradeColor(report.grade)} mb-6 shadow-2xl`}>
                <span className="text-5xl font-black text-white">{report.grade}</span>
              </div>
              <div className="text-4xl font-bold text-white mb-2">{report.score}</div>
              <div className="text-gray-400">总分 / 100</div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white">得分明细</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">救援成功率</span>
                </div>
                <span className="text-white font-semibold">{report.breakdown.successRate}/40</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">响应速度</span>
                </div>
                <span className="text-white font-semibold">{report.breakdown.speedScore}/30</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">装备正确率</span>
                </div>
                <span className="text-white font-semibold">{report.breakdown.equipmentScore}/20</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <span className="text-gray-300">警告处理</span>
                </div>
                <span className="text-white font-semibold">{report.breakdown.warningScore}/10</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated" className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 mb-8">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">救援统计</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-xl">
                <div className="text-3xl font-bold text-white mb-1">{report.totalVictims}</div>
                <div className="text-sm text-gray-400">伤员总数</div>
              </div>
              <div className="text-center p-4 bg-green-900/30 rounded-xl">
                <div className="text-3xl font-bold text-green-400 mb-1">{report.rescued}</div>
                <div className="text-sm text-gray-400">成功救援</div>
              </div>
              <div className="text-center p-4 bg-red-900/30 rounded-xl">
                <div className="text-3xl font-bold text-red-400 mb-1">{report.failed}</div>
                <div className="text-sm text-gray-400">救援失败</div>
              </div>
              <div className="text-center p-4 bg-gray-700/50 rounded-xl">
                <div className="text-3xl font-bold text-white mb-1">{formatTime(report.totalTime)}</div>
                <div className="text-sm text-gray-400">总用时</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 mb-8">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">警告处理情况</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-700/50 rounded-xl">
                <div className="text-2xl font-bold text-white mb-1">{report.warnings.length}</div>
                <div className="text-sm text-gray-400">警告总数</div>
              </div>
              <div className="text-center p-4 bg-blue-900/30 rounded-xl">
                <div className="text-2xl font-bold text-blue-400 mb-1">{report.corrected}</div>
                <div className="text-sm text-gray-400">已修正</div>
              </div>
              <div className="text-center p-4 bg-orange-900/30 rounded-xl">
                <div className="text-2xl font-bold text-orange-400 mb-1">{report.needsConfirmation}</div>
                <div className="text-sm text-gray-400">待确认</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" onClick={restartGame}>
            <RotateCcw className="w-5 h-5 mr-2" />
            再来一局
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/replay')}>
            <Play className="w-5 h-5 mr-2" />
            查看回放
          </Button>
          <Button size="lg" variant="success" onClick={() => navigate('/report')}>
            <FileText className="w-5 h-5 mr-2" />
            导出报告
          </Button>
        </div>
      </div>
    </div>
  );
};
