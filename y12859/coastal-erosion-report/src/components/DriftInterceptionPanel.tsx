import { useState } from 'react';
import { Navigation, AlertTriangle, XCircle, CheckCircle, Info, Shield, MapPin } from 'lucide-react';
import { interceptDriftData, generateDriftInterceptionReport, DRIFT_THRESHOLD_KM } from '../utils/reportExport';
import { mockBuoyData } from '../data/mockData';

export default function DriftInterceptionPanel() {
  const [selectedInterception, setSelectedInterception] = useState<number | null>(null);

  const { validBuoys, interceptedBuoys, summary } = interceptDriftData(mockBuoyData);
  const report = generateDriftInterceptionReport(interceptedBuoys);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Navigation className="w-7 h-7 text-ocean-600" />
            轨迹漂移拦截
          </h2>
          <p className="text-slate-500 mt-1">自动识别漂移数据并拦截，确保计算结果可靠</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8" />
          <div>
            <h3 className="text-xl font-bold">漂移拦截机制</h3>
            <p className="text-ocean-200 text-sm">三道防线保障数据质量</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-ocean-200 text-sm mb-1">第一级</div>
            <div className="font-semibold">实时监测</div>
            <div className="text-ocean-300 text-xs mt-1">持续比对浮标实际位置与预期位置</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-ocean-200 text-sm mb-1">第二级</div>
            <div className="font-semibold">自动拦截</div>
            <div className="text-ocean-300 text-xs mt-1">
              漂移超过 {DRIFT_THRESHOLD_KM}km 自动标记
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-ocean-200 text-sm mb-1">第三级</div>
            <div className="font-semibold">分级处理</div>
            <div className="text-ocean-300 text-xs mt-1">严重漂移完全排除，轻度降权使用</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">总记录数</span>
            <MapPin className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{summary.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">有效数据</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600 mt-2">{summary.valid}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">拦截数量</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{summary.intercepted}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">拦截率</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">
            {(summary.interceptionRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            拦截记录
          </h3>

          <div className="space-y-3">
            {interceptedBuoys.map((interception, idx) => {
              const isSelected = selectedInterception === idx;
              const isCritical = interception.severity === 'critical';
              
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedInterception(isSelected ? null : idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? isCritical 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCritical ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        {isCritical ? (
                          <XCircle className={`w-5 h-5 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
                        ) : (
                          <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{interception.buoyId}</div>
                        <div className="text-xs text-slate-500">{interception.timestamp}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                        {interception.driftDistance.toFixed(2)} km
                      </div>
                      <div className={`text-xs ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                        {isCritical ? '严重漂移' : '轻度漂移'}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">漂移原因</div>
                        <div className="text-sm text-slate-700">{interception.reason}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">处理措施</div>
                        <div className="text-sm text-slate-700">{interception.action}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-xs text-slate-500">预期位置</div>
                          <div className="text-xs font-mono text-slate-700">
                            {interception.expectedLocation.lat.toFixed(4)}, 
                            {interception.expectedLocation.lng.toFixed(4)}
                          </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <div className="text-xs text-slate-500">实际位置</div>
                          <div className="text-xs font-mono text-slate-700">
                            {interception.actualLocation.lat.toFixed(4)}, 
                            {interception.actualLocation.lng.toFixed(4)}
                          </div>
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg text-xs ${
                        interception.excludedFromCalculation 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {interception.excludedFromCalculation 
                          ? '⚠️ 该数据已完全排除，不参与侵蚀计算' 
                          : '⚠️ 该数据降权使用，需人工复核'
                        }
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              拦截统计
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">严重漂移（完全排除）</span>
                <span className="font-bold text-red-600">{report.criticalCount} 条</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${report.totalIntercepted > 0 ? (report.criticalCount / report.totalIntercepted) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">轻度漂移（降权使用）</span>
                <span className="font-bold text-amber-600">{report.warningCount} 条</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${report.totalIntercepted > 0 ? (report.warningCount / report.totalIntercepted) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-ocean-500" />
              常见漂移原因
            </h3>

            <div className="space-y-3">
              {report.commonReasons.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-600 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-700">{item.reason}</div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-ocean-500 h-1.5 rounded-full"
                        style={{ width: `${(item.count / report.totalIntercepted) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600">{item.count}次</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">拦截阈值说明</h3>
            <div className="text-xs text-slate-600 space-y-2 whitespace-pre-line">
              {report.explanation}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">有效浮标数据（已通过拦截）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-slate-600">浮标编号</th>
                <th className="text-left py-2.5 px-4 font-medium text-slate-600">时间</th>
                <th className="text-left py-2.5 px-4 font-medium text-slate-600">位置</th>
                <th className="text-right py-2.5 px-4 font-medium text-slate-600">漂移距离</th>
                <th className="text-right py-2.5 px-4 font-medium text-slate-600">浪高</th>
                <th className="text-right py-2.5 px-4 font-medium text-slate-600">水深</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-600">状态</th>
              </tr>
            </thead>
            <tbody>
              {validBuoys.map((buoy) => (
                <tr key={buoy.id} className="border-t border-slate-100 table-row-hover">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{buoy.buoyId}</td>
                  <td className="py-2.5 px-4 text-slate-600">{buoy.timestamp}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {buoy.location.lat.toFixed(4)}, {buoy.location.lng.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-green-600 font-medium">
                    {buoy.driftDistance.toFixed(3)} km
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{buoy.waveHeight} m</td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{buoy.waterDepth} m</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      有效
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
