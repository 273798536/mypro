import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { RoundRecord } from '@/types/game';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { TrendingUp, DollarSign } from 'lucide-react';

interface ProfitChartProps {
  history: RoundRecord[];
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ history }) => {
  const chartData = history.map(record => ({
    round: `第${record.round}回合`,
    netProfit: record.netProfit,
    endingCash: record.endingCash,
    exchangeRate: record.exchangeRate,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            现金余额走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '现金余额']}
                />
                <Line
                  type="monotone"
                  dataKey="endingCash"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            每回合净利润
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="round" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`} />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString('zh-CN')}`, '净利润']}
                />
                <Bar
                  dataKey="netProfit"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
