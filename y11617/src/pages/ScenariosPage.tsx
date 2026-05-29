import { useState } from 'react';
import ScenarioList from '../components/scenarios/ScenarioList';
import ExportPanel from '../components/scenarios/ExportPanel';
import type { Scenario } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { calculateDailySummaries } from '../utils/balanceCalculator';

export default function ScenariosPage() {
  const [compareScenarios, setCompareScenarios] = useState<Scenario[]>([]);

  const handleCompare = (scenarios: Scenario[]) => {
    setCompareScenarios(scenarios);
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b'];

  const combinedData = () => {
    if (compareScenarios.length === 0) return [];

    const today = new Date().toISOString().split('T')[0];
    const days = 90;

    const forecasts = compareScenarios.map(scenario => {
      const summaries = calculateDailySummaries(
        scenario.entries,
        scenario.settings,
        today,
        days
      );
      return summaries.map(s => ({ date: s.date, balance: s.balance }));
    });

    const maxLength = Math.max(...forecasts.map(f => f.length));
    if (maxLength === 0) return [];

    const result = [];

    for (let i = 0; i < maxLength; i++) {
      const point: any = { dateLabel: '' };
      forecasts.forEach((forecast, idx) => {
        if (forecast[i]) {
          point.dateLabel = format(parseISO(forecast[i].date), 'MM/dd');
          point[`方案${idx + 1}`] = forecast[i].balance;
        }
      });
      result.push(point);
    }

    return result;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">方案管理</h1>
        <p className="text-sm text-gray-500 mt-1">保存、对比和导出现金流方案</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ScenarioList onCompare={handleCompare} />

          {compareScenarios.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">方案对比</h3>
                <button
                  onClick={() => setCompareScenarios([])}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  关闭对比
                </button>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={value => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, '余额']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend />
                    {compareScenarios.map((scenario, idx) => (
                      <Line
                        key={scenario.id}
                        type="monotone"
                        dataKey={`方案${idx + 1}`}
                        name={scenario.name}
                        stroke={colors[idx]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div>
          <ExportPanel />
        </div>
      </div>
    </div>
  );
}