import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { Score } from '@/types';
import { getScoreGrade } from '@/utils/scoreEngine';

interface ScoreRadarProps {
  score: Score;
}

export const ScoreRadar: React.FC<ScoreRadarProps> = ({ score }) => {
  const data = [
    { subject: '温度准确度', A: score.accuracy, fullMark: 100 },
    { subject: '时间效率', A: score.efficiency, fullMark: 100 },
    { subject: '热量守恒', A: score.conservation, fullMark: 100 },
  ];

  const grade = getScoreGrade(score.total);
  const gradeColor = 
    grade === 'S' ? 'text-purple-600' :
    grade === 'A' ? 'text-green-600' :
    grade === 'B' ? 'text-blue-600' :
    grade === 'C' ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display text-center">成绩分析</h3>
      
      <div className="text-center mb-4">
        <span className={`text-5xl font-bold ${gradeColor}`}>{grade}</span>
        <div className="text-2xl font-bold mt-2">{score.total} 分</div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#E8D5C4" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="得分"
              dataKey="A"
              stroke="#E67E22"
              fill="#E67E22"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
        <div>
          <div className="text-sm text-gray-500">温度准确度</div>
          <div className="text-xl font-bold text-orange-500">{score.accuracy}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">时间效率</div>
          <div className="text-xl font-bold text-blue-500">{score.efficiency}</div>
        </div>
        <div>
          <div className="text-sm text-gray-500">热量守恒</div>
          <div className="text-xl font-bold text-green-500">{score.conservation}</div>
        </div>
      </div>
    </div>
  );
};
