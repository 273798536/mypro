import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { CircleDot, AlertTriangle, FileText, Clock, Target, Edit3 } from 'lucide-react';
import type { ReportStats } from '../../types/report';
import { formatTime } from '../../utils/time';

interface StatsOverviewProps {
  stats: ReportStats;
  levelName: string;
  generatedAt: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, levelName, generatedAt }) => {
  const statItems = [
    {
      label: '总碰撞次数',
      value: stats.totalCollisions,
      icon: CircleDot,
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
    },
    {
      label: '边界碰撞',
      value: stats.boundaryCollisions,
      icon: Target,
      color: 'text-accent-orange',
      bgColor: 'bg-orange-50',
    },
    {
      label: '异常标注',
      value: stats.anomalyCount,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      label: '正常标注',
      value: stats.normalAnnotations,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: '草稿数量',
      value: stats.draftCount,
      icon: Edit3,
      color: 'text-neutral-500',
      bgColor: 'bg-neutral-50',
    },
    {
      label: '平均标注时长',
      value: formatTime(stats.avgAnnotationTime),
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-800">{levelName}</h2>
          <p className="text-neutral-500 text-sm mt-1">
            报告生成时间：{new Date(generatedAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className={`${item.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold text-neutral-800">{item.value}</p>
              <p className="text-sm text-neutral-500 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
