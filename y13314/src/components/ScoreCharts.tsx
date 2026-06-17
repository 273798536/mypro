import { useAppStore } from '@/store/useAppStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const STATUS_COLORS = {
  approved: '#38a169',
  rejected: '#c53030',
  pending: '#d69e2e',
  suspended: '#3182ce',
};

const STATUS_NAMES = {
  approved: '已批准',
  rejected: '已拒绝',
  pending: '待处理',
  suspended: '已挂起',
};

export const ScoreDistributionChart = () => {
  const { filteredSamples } = useAppStore();

  const distributionData = [
    { range: '300-500', count: filteredSamples.filter(s => s.latestScore >= 300 && s.latestScore < 500).length, color: '#c53030' },
    { range: '500-600', count: filteredSamples.filter(s => s.latestScore >= 500 && s.latestScore < 600).length, color: '#d69e2e' },
    { range: '600-650', count: filteredSamples.filter(s => s.latestScore >= 600 && s.latestScore < 650).length, color: '#fbbf24' },
    { range: '650-700', count: filteredSamples.filter(s => s.latestScore >= 650 && s.latestScore < 700).length, color: '#68d391' },
    { range: '700-800', count: filteredSamples.filter(s => s.latestScore >= 700 && s.latestScore < 800).length, color: '#38a169' },
    { range: '800-900', count: filteredSamples.filter(s => s.latestScore >= 800 && s.latestScore <= 900).length, color: '#276749' },
  ];

  return (
    <div className="card p-5">
      <h3 className="font-serif text-lg font-semibold text-navy-800 mb-4">评分分布</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={distributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 0,
              fontFamily: 'JetBrains Mono',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} 样本`, '数量']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 pt-3 border-t border-dashed border-navy-200">
        <div className="flex items-center justify-between text-xs text-navy-500">
          <span>阈值线：<span className="font-mono font-semibold text-navy-700">650分</span></span>
          <span>共 <span className="font-mono font-semibold text-navy-700">{filteredSamples.length}</span> 样本</span>
        </div>
      </div>
    </div>
  );
};

export const StatusPieChart = () => {
  const { filteredSamples } = useAppStore();

  const pieData = [
    { name: STATUS_NAMES.approved, value: filteredSamples.filter(s => s.status === 'approved').length },
    { name: STATUS_NAMES.rejected, value: filteredSamples.filter(s => s.status === 'rejected').length },
    { name: STATUS_NAMES.pending, value: filteredSamples.filter(s => s.status === 'pending').length },
    { name: STATUS_NAMES.suspended, value: filteredSamples.filter(s => s.status === 'suspended').length },
  ].filter(d => d.value > 0);

  return (
    <div className="card p-5">
      <h3 className="font-serif text-lg font-semibold text-navy-800 mb-4">状态分布</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={STATUS_COLORS[Object.keys(STATUS_NAMES)[index] as keyof typeof STATUS_COLORS]} 
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 0,
              fontFamily: 'JetBrains Mono',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [`${value} 样本`, name]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="square"
            formatter={(value) => <span className="text-xs text-navy-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PassRateTrendChart = () => {
  const { samples, filters } = useAppStore();

  const monthlyData = [
    { month: '1月', pass: 8, total: 12, rate: 66.7 },
    { month: '2月', pass: 10, total: 14, rate: 71.4 },
    { month: '3月', pass: 7, total: 9, rate: 77.8 },
    { month: '4月', pass: 9, total: 11, rate: 81.8 },
    { month: '5月', pass: 8, total: 10, rate: 80.0 },
    { month: '6月', pass: 5, total: 6, rate: 83.3 },
  ];

  return (
    <div className="card p-5">
      <h3 className="font-serif text-lg font-semibold text-navy-800 mb-4">通过率趋势</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'JetBrains Mono' }} 
            axisLine={false} 
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 0,
              fontFamily: 'JetBrains Mono',
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, '通过率']}
          />
          <Line 
            type="monotone" 
            dataKey="rate" 
            stroke="#1a365d" 
            strokeWidth={2}
            dot={{ fill: '#1a365d', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#d69e2e', stroke: '#1a365d', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
