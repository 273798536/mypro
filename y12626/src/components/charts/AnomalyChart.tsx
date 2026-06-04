import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAppStore } from '../../store/useAppStore';

const COLORS = ['#4682b4', '#C41E3A', '#D4A84B', '#B8860B', '#CD853F'];

const AnomalyChart: React.FC = () => {
  const getQualityMetrics = useAppStore(state => state.getQualityMetrics);
  const trackPoints = useAppStore(state => state.trackPoints);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const dataVersion = useAppStore(state => state.dataVersion);

  const metrics = useMemo(() => getQualityMetrics(), [getQualityMetrics, dataVersion]);

  const statusData = useMemo(() => {
    const statusMap: Record<string, string> = {
      'normal': '正常',
      'out-of-bounds': '边界越界',
      'color-invalid': '颜色异常',
      'missing-unit': '缺项漏填',
      'supplementary': '补录数据'
    };
    
    return Object.entries(metrics.byStatus).map(([key, value]) => ({
      name: statusMap[key] || key,
      value: value,
      status: key
    }));
  }, [metrics.byStatus]);

  const materialData = useMemo(() => {
    return metrics.byMaterial.map(m => ({
      name: m.materialName.length > 8 ? m.materialName.slice(0, 8) + '...' : m.materialName,
      正常: m.total - m.anomalies,
      异常: m.anomalies,
      total: m.total,
      materialId: m.materialId
    }));
  }, [metrics.byMaterial]);

  const elevationTrend = useMemo(() => {
    const sorted = [...trackPoints].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.slice(0, 30).map((p, idx) => ({
      name: `点${idx + 1}`,
      海拔: p.elevation || 0,
      状态: p.status === 'normal' ? '正常' : '异常',
      color: p.status === 'normal' ? '#4682b4' : '#C41E3A'
    }));
  }, [trackPoints, dataVersion]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-xuan-50 border border-ochre-300 rounded p-2 shadow-card">
          <p className="text-sm font-serif text-ink-600">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
        <h3 className="font-serif text-ink-600 mb-3">异常类型分布</h3>
        <div className="flex items-center gap-4">
          <div style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1">
            {statusData.map((item, idx) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-ink-600">{item.name}</span>
                </div>
                <span className="font-serif text-ochre-700">{item.value} 点</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
        <h3 className="font-serif text-ink-600 mb-3">按材料统计</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={materialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4A84B" opacity="0.3" />
              <XAxis dataKey="name" tick={{ fill: '#8B4513', fontSize: 11 }} />
              <YAxis tick={{ fill: '#8B4513', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="正常" fill="#4682b4" stackId="a" />
              <Bar dataKey="异常" fill="#C41E3A" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-xuan-50 border border-ochre-300 rounded-lg p-4">
        <h3 className="font-serif text-ink-600 mb-3">海拔趋势（最近30点）</h3>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={elevationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D4A84B" opacity="0.3" />
              <XAxis dataKey="name" tick={{ fill: '#8B4513', fontSize: 9 }} />
              <YAxis tick={{ fill: '#8B4513', fontSize: 11 }} unit="m" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="海拔" radius={[4, 4, 0, 0]}>
                {elevationTrend.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnomalyChart;
