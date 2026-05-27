import type { ReportData } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy, Target, Clock, CheckCircle, XCircle, Layers } from 'lucide-react';

interface ScoreOverviewProps {
  report: ReportData;
}

export function ScoreOverview({ report }: ScoreOverviewProps) {
  const { summary } = report;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const stats = [
    {
      label: '总得分',
      value: summary.totalScore,
      icon: Trophy,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: '正确率',
      value: `${summary.accuracy}%`,
      icon: Target,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      label: '游戏时长',
      value: formatTime(summary.playTime),
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: '完成关卡',
      value: summary.levelsCompleted,
      icon: Layers,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: '正确判断',
      value: summary.correctJudgements,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      label: '错误次数',
      value: summary.totalErrors,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>成绩概览</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`${stat.bgColor} rounded-lg p-4 text-center`}
            >
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">正确率进度</span>
            <span className="text-white">{summary.accuracy}%</span>
          </div>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-500"
              style={{ width: `${summary.accuracy}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
