import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useValuationStore } from '@/store/valuationStore';
import { formatCurrency, getQuarter } from '@/utils/format';
import { dataSourceLabels } from '@/data/mockData';

interface ValuationChartProps {
  type?: 'line' | 'bar';
}

export default function ValuationChart({ type = 'line' }: ValuationChartProps) {
  const getFilteredValuations = useValuationStore((state) => state.getFilteredValuations);
  const filteredValuations = getFilteredValuations();

  const chartData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    
    filteredValuations.forEach((v) => {
      const quarter = getQuarter(v.valuationDate);
      if (!grouped[quarter]) {
        grouped[quarter] = {};
      }
      const sourceKey = dataSourceLabels[v.dataSource];
      grouped[quarter][sourceKey] = (grouped[quarter][sourceKey] || 0) + v.valuationAmount;
    });

    return Object.entries(grouped)
      .map(([quarter, values]) => ({
        quarter,
        ...values,
      }))
      .sort((a, b) => a.quarter.localeCompare(b.quarter));
  }, [filteredValuations]);

  const colors = ['#33689f', '#d4af37', '#22c55e'];
  const dataSources = Object.values(dataSourceLabels);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-medium text-slate-800">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        暂无符合筛选条件的数据
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataSources.map((source, index) => (
              <Line
                key={source}
                type="monotone"
                dataKey={source}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataSources.map((source, index) => (
              <Bar
                key={source}
                dataKey={source}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
