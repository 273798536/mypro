import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { useRideStore } from '@/store/useRideStore';
import { generatePowerCurveData, generateResistanceBreakdown, getPowerZoneInfo } from '@/utils/powerCalculator';
import { POWER_ZONES } from '@/types';

const PowerCharts: React.FC = () => {
  const { currentInput, currentResult, ftp } = useRideStore();

  if (!currentResult) {
    return null;
  }

  const powerCurveData = generatePowerCurveData(currentInput);
  const resistanceData = generateResistanceBreakdown(currentResult);

  const zoneDistribution = POWER_ZONES.map((zone) => ({
    name: `Z${zone.zone}`,
    fullName: zone.name,
    value: currentResult.powerZone === zone.zone ? 100 : 0,
    color: zone.color,
  }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          <h3 className="font-semibold">功率-踏频曲线</h3>
        </div>
        <div className="card-body">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powerCurveData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="cadence" 
                  stroke="#64748B"
                  label={{ value: '踏频 (RPM)', position: 'insideBottom', offset: -5, fill: '#64748B' }}
                />
                <YAxis 
                  stroke="#64748B"
                  label={{ value: '功率 (W)', angle: -90, position: 'insideLeft', fill: '#64748B' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}${name === 'power' ? 'W' : 'km/h'}`,
                    name === 'power' ? '功率' : '速度',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="#165DFF"
                  strokeWidth={2}
                  dot={{ fill: '#165DFF', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2D7BFF' }}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#52C41A"
                  strokeWidth={2}
                  dot={{ fill: '#52C41A', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#73D13D' }}
                  yAxisId={0}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500" />
              <span className="text-dark-400">功率 (W)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success-500" />
              <span className="text-dark-400">速度 (km/h)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">阻力分布</h3>
          </div>
          <div className="card-body">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resistanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {resistanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}W (${props.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {resistanceData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-dark-300">{item.name}</span>
                  </div>
                  <span className="font-mono text-dark-200">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">功率区间</h3>
          </div>
          <div className="card-body">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={POWER_ZONES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="zone" 
                    stroke="#64748B"
                    tickFormatter={(value) => `Z${value}`}
                  />
                  <YAxis stroke="#64748B" hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#F1F5F9',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${(props.payload.min * 100).toFixed(0)}% - ${props.payload.max === Infinity ? '∞' : (props.payload.max * 100).toFixed(0)}% FTP`,
                      props.payload.name,
                    ]}
                  />
                  <Bar dataKey="zone" radius={[4, 4, 0, 0]}>
                    {POWER_ZONES.map((zone, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={zone.color}
                        opacity={currentResult.powerZone === zone.zone ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <span
                className="badge text-sm px-3 py-1.5"
                style={{
                  backgroundColor: `${getPowerZoneInfo(currentResult.power, ftp).color}20`,
                  color: getPowerZoneInfo(currentResult.power, ftp).color,
                }}
              >
                当前: Z{currentResult.powerZone} {getPowerZoneInfo(currentResult.power, ftp).name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerCharts;
