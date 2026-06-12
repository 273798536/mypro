import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, AlertTriangle, CheckCircle, XCircle, Info, Ruler, Droplet, Waves } from 'lucide-react';
import { calculateErosionProfile, generateProfilePoints, getCalculationStatusInfo } from '../utils/erosionCalculator';
import { mockBuoyData, mockWaterQualityRecords, mockAquacultureLogs, mockErosionCalculations } from '../data/mockData';

export default function ErosionCalculator() {
  const [sectionName, setSectionName] = useState('新断面');
  const [shoreElevation, setShoreElevation] = useState(2.5);
  const [maxDepth, setMaxDepth] = useState(8);
  const [totalDistance, setTotalDistance] = useState(300);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const profilePoints = useMemo(() => 
    generateProfilePoints(shoreElevation, maxDepth, totalDistance),
    [shoreElevation, maxDepth, totalDistance]
  );

  const calcResult = useMemo(() => 
    calculateErosionProfile({
      sectionName,
      profilePoints,
      buoys: mockBuoyData,
      waterQuality: mockWaterQualityRecords,
      aquacultureLogs: mockAquacultureLogs,
    }),
    [sectionName, profilePoints]
  );

  const chartData = profilePoints.map(p => ({
    ...p,
    name: `${p.distanceFromShore}m`,
  }));

  const statusInfo = getCalculationStatusInfo(calcResult.calculationStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-ocean-600" />
            海岸侵蚀剖面计算
          </h2>
          <p className="text-slate-500 mt-1">输入参数计算剖面侵蚀速率，公式、单位、适用范围一目了然</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-ocean-500" />
              计算参数
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  断面名称
                </label>
                <input
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  岸线高程 (m)
                </label>
                <input
                  type="number"
                  value={shoreElevation}
                  onChange={(e) => setShoreElevation(Number(e.target.value))}
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  最大水深 (m)
                </label>
                <input
                  type="number"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  step="0.5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  剖面总距离 (m)
                </label>
                <input
                  type="number"
                  value={totalDistance}
                  onChange={(e) => setTotalDistance(Number(e.target.value))}
                  step="10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-ocean-50 to-ocean-100 rounded-xl border border-ocean-200 p-5">
            <h3 className="font-semibold text-ocean-800 mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              计算公式
            </h3>
            <div className="bg-white/70 rounded-lg p-3 font-mono text-sm text-ocean-900 border border-ocean-200">
              {calcResult.formula}
            </div>
            <p className="text-sm text-ocean-700 mt-3">
              {calcResult.formulaDescription}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              适用范围
            </h3>
            <p className="text-sm text-slate-600">{calcResult.applicableScope}</p>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-2">单位说明</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>距离: {calcResult.units.distance}</div>
                <div>高程: {calcResult.units.elevation}</div>
                <div>侵蚀速率: {calcResult.units.erosionRate}</div>
                <div>体积: {calcResult.units.volume}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-8 space-y-4">
          <div className={`rounded-xl border p-5 ${statusInfo.bg} ${statusInfo.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {calcResult.calculationStatus === 'success' && (
                  <CheckCircle className={`w-8 h-8 ${statusInfo.color}`} />
                )}
                {calcResult.calculationStatus === 'partial' && (
                  <AlertTriangle className={`w-8 h-8 ${statusInfo.color}`} />
                )}
                {calcResult.calculationStatus === 'failed' && (
                  <XCircle className={`w-8 h-8 ${statusInfo.color}`} />
                )}
                <div>
                  <div className={`text-lg font-semibold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </div>
                  <div className="text-sm text-slate-600">
                    断面: {calcResult.sectionName}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">数据来源</div>
                <div className="text-sm text-slate-700">{calcResult.dataSources.join('、')}</div>
              </div>
            </div>

            {calcResult.warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <div className="text-sm font-medium text-amber-700 mb-2">⚠️ 注意事项</div>
                <ul className="text-sm text-amber-600 space-y-1">
                  {calcResult.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {calcResult.failureReasons.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <div className="text-sm font-medium text-red-700 mb-2">❌ 失败原因</div>
                <ul className="text-sm text-red-600 space-y-1">
                  {calcResult.failureReasons.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {calcResult.affectedByDelayedLogs && (
              <div className="mt-4 pt-4 border-t border-orange-200">
                <div className="text-sm font-medium text-orange-700 mb-2">
                  🕐 受{calcResult.delayedLogCount}份延迟养殖日志影响
                </div>
                <p className="text-sm text-orange-600">
                  相关计算结果可能需要在日志补录后重新计算更新
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">剖面曲线图</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} label={{ value: '距岸距离 (m)', position: 'bottom', offset: -5, fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: '高程 (m)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value) => [`${Number(value).toFixed(2)} m`, '高程']}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="5 5" />
                  <Line 
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#0284c7" 
                    strokeWidth={2}
                    dot={{ fill: '#0284c7', r: 4 }}
                    activeDot={{ r: 6, fill: '#0ea5e9' }}
                    fill="#bae6fd"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                <Waves className="w-4 h-4" />
                岸线位置
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {calcResult.shorelinePosition.toFixed(1)}
                <span className="text-sm font-normal text-slate-500 ml-1">m</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-sm text-slate-500 mb-1">平均侵蚀速率</div>
              <div className={`text-2xl font-bold ${calcResult.averageErosionRate < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {calcResult.averageErosionRate > 0 ? '+' : ''}{calcResult.averageErosionRate.toFixed(2)}
                <span className="text-sm font-normal text-slate-500 ml-1">m/a</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-sm text-slate-500 mb-1">最大侵蚀深度</div>
              <div className="text-2xl font-bold text-slate-800">
                {calcResult.maximumErosionDepth.toFixed(2)}
                <span className="text-sm font-normal text-slate-500 ml-1">m</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                <Droplet className="w-4 h-4" />
                侵蚀体积
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {calcResult.erosionVolume.toFixed(0)}
                <span className="text-sm font-normal text-slate-500 ml-1">m³</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">历史计算结果</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">断面</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">日期</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">侵蚀速率</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">最大深度</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">状态</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">延迟日志影响</th>
                  </tr>
                </thead>
                <tbody>
                  {mockErosionCalculations.map((result) => {
                    const sInfo = getCalculationStatusInfo(result.calculationStatus);
                    return (
                      <tr 
                        key={result.profileId}
                        className="border-b border-slate-100 table-row-hover cursor-pointer"
                        onClick={() => setSelectedSection(selectedSection === result.sectionName ? null : result.sectionName)}
                      >
                        <td className="py-3 px-3 font-medium text-slate-800">{result.sectionName}</td>
                        <td className="py-3 px-3 text-slate-600">{result.calculationDate}</td>
                        <td className={`py-3 px-3 text-right font-medium ${result.averageErosionRate < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {result.averageErosionRate > 0 ? '+' : ''}{result.averageErosionRate} m/a
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">{result.maximumErosionDepth} m</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${sInfo.bg} ${sInfo.color}`}>
                            {sInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {result.affectedByDelayedLogs ? (
                            <span className="text-orange-600 text-xs">
                              受{result.delayedLogCount}份影响
                            </span>
                          ) : (
                            <span className="text-green-600 text-xs">无</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
