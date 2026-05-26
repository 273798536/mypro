import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { GameAction } from '@/types';
import { ERROR_TYPE_LABELS } from '@/types';

interface StatsChartProps {
  actions: GameAction[];
}

export function StatsChart({ actions }: StatsChartProps) {
  const errorTypes = ['reserved_return', 'damaged_unregistered', 'shelf_mismatch', 'return_mismatch'] as const;
  
  const errorData = errorTypes.map(type => ({
    type,
    错误数: actions.filter(a => a.errorType === type).length,
    名称: ERROR_TYPE_LABELS[type],
  }));

  const timelineData = actions.map((action, index) => ({
    序号: index + 1,
    得分: action.points,
    累积: actions.slice(0, index + 1).reduce((sum, a) => sum + a.points, 0),
  }));

  const correctCount = actions.filter(a => a.isCorrect).length;
  const errorCount = actions.filter(a => !a.isCorrect).length;

  const pieData = [
    { name: '正确', value: correctCount, fill: '#22c55e' },
    { name: '错误', value: errorCount, fill: '#ef4444' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-amber-900 mb-6">统计分析</h2>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-amber-800 mb-3">正确/错误比例</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-amber-800 mb-3">错误类型分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={errorData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="名称" />
                <PolarRadiusAxis />
                <Radar
                  name="错误数"
                  dataKey="错误数"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-semibold text-amber-800 mb-3">得分趋势</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="序号" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="得分" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
