import { useState } from 'react';
import { X, BarChart3, TrendingUp, FileText, Camera } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useSolarStore } from '../store/solarStore';
import { generateDailyData } from '../utils/solarCalculator';

export function ComparisonChart() {
  const [isOpen, setIsOpen] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const { scenarios, selectedScenarioIds, params, results } = useSolarStore();

  const selectedScenarios = scenarios.filter(s => selectedScenarioIds.includes(s.id));

  const barData = selectedScenarios.map(s => ({
    name: s.name,
    功率: parseFloat(s.results.powerOutput.toFixed(2)),
    辐照量: parseFloat(s.results.irradiation.toFixed(0)),
    高度角: parseFloat(s.results.solarElevation.toFixed(1)),
  }));

  const currentDailyData = generateDailyData(params).map(d => ({
    ...d,
    name: `${d.hour}时`
  }));

  const dailyDatasets = selectedScenarios.map(s => ({
    name: s.name,
    data: generateDailyData(s.params)
  }));

  const combinedDailyData = currentDailyData.map((item, index) => {
    const combined: Record<string, string | number> = { name: item.name };
    combined['当前'] = item.power;
    selectedScenarios.forEach(s => {
      combined[s.name] = dailyDatasets.find(d => d.name === s.name)?.data[index]?.power || 0;
    });
    return combined;
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <>
      {selectedScenarioIds.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-24 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
        >
          <BarChart3 className="w-5 h-5" />
          <span>对比分析 ({selectedScenarioIds.length})</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  情景对比分析
                </h2>
                <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      chartType === 'bar' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    柱状图
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      chartType === 'line' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    日曲线
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {chartType === 'bar' ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="功率" fill="#10b981" name="功率 (kW)" />
                      <Bar dataKey="辐照量" fill="#f59e0b" name="辐照量 (W/㎡)" />
                      <Bar dataKey="高度角" fill="#3b82f6" name="高度角 (°)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedDailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="当前" stroke="#10b981" strokeWidth={2} dot={false} />
                      {selectedScenarios.map((s, i) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={s.name}
                          stroke={colors[i % colors.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4">
                {selectedScenarios.map((scenario, index) => (
                  <div
                    key={scenario.id}
                    className="bg-gray-800 rounded-xl p-4 border-l-4"
                    style={{ borderLeftColor: colors[index % colors.length] }}
                  >
                    <div className="font-medium text-white mb-2">{scenario.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">地点:</span>
                        <span className="text-gray-300 ml-1">{scenario.params.location.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">日期:</span>
                        <span className="text-gray-300 ml-1">{scenario.params.date}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">倾角:</span>
                        <span className="text-gray-300 ml-1">{scenario.params.tiltAngle}°</span>
                      </div>
                      <div>
                        <span className="text-gray-500">天气:</span>
                        <span className="text-gray-300 ml-1">{(scenario.params.weatherFactor * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">面积:</span>
                        <span className="text-gray-300 ml-1">{scenario.params.panelArea}㎡</span>
                      </div>
                      <div>
                        <span className="text-gray-500">功率:</span>
                        <span className="text-emerald-400 ml-1 font-mono">{scenario.results.powerOutput.toFixed(2)} kW</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
