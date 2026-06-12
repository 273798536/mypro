import { useState } from 'react';
import { Waves, AlertTriangle, CheckCircle, XCircle, MapPin, Info } from 'lucide-react';
import type { BuoyData } from '../types';
import { detectDrift, DRIFT_THRESHOLD_KM } from '../utils/erosionCalculator';
import { mockBuoyData } from '../data/mockData';

function getDataQualityInfo(quality: 'good' | 'warning' | 'error') {
  switch (quality) {
    case 'good':
      return { label: '良好', color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500' };
    case 'warning':
      return { label: '警告', color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' };
    case 'error':
      return { label: '异常', color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' };
  }
}

export default function BuoyDataPanel() {
  const [selectedBuoy, setSelectedBuoy] = useState<BuoyData | null>(null);
  const [filterQuality, setFilterQuality] = useState<'all' | 'good' | 'warning' | 'error'>('all');

  const filteredData = filterQuality === 'all' 
    ? mockBuoyData 
    : mockBuoyData.filter(b => b.dataQuality === filterQuality);

  const driftCount = mockBuoyData.filter(b => b.driftDetected).length;
  const validCount = mockBuoyData.filter(b => b.dataQuality === 'good').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Waves className="w-7 h-7 text-ocean-600" />
            浮标监测数据
          </h2>
          <p className="text-slate-500 mt-1">实时监控浮标位置与海洋环境参数</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">总记录数</span>
            <Waves className="w-5 h-5 text-ocean-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{mockBuoyData.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">数据良好</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600 mt-2">{validCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">漂移记录</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{driftCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">漂移阈值</span>
            <Info className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-2">{DRIFT_THRESHOLD_KM} km</div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'good', 'warning', 'error'] as const).map((filter) => {
          const info = filter === 'all' ? null : getDataQualityInfo(filter);
          const isActive = filterQuality === filter;
          return (
            <button
              key={filter}
              onClick={() => setFilterQuality(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-ocean-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter === 'all' ? '全部' : info?.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-600">浮标编号</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">时间</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">位置</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">漂移距离</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">浪高</th>
              <th className="text-right py-3 px-4 font-medium text-slate-600">水深</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">数据质量</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">漂移状态</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((buoy) => {
              const qualityInfo = getDataQualityInfo(buoy.dataQuality);
              const driftInfo = detectDrift(buoy);
              
              return (
                <tr 
                  key={buoy.id}
                  className="border-t border-slate-100 table-row-hover cursor-pointer"
                  onClick={() => setSelectedBuoy(selectedBuoy?.id === buoy.id ? null : buoy)}
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-800">{buoy.buoyId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{buoy.timestamp}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {buoy.location.lat.toFixed(4)}, {buoy.location.lng.toFixed(4)}
                    </div>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${buoy.driftDetected ? 'text-red-600' : 'text-slate-700'}`}>
                    {buoy.driftDistance.toFixed(3)} km
                  </td>
                  <td className="py-3 px-4 text-right text-slate-700">{buoy.waveHeight} m</td>
                  <td className="py-3 px-4 text-right text-slate-700">{buoy.waterDepth} m</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${qualityInfo.bg} ${qualityInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${qualityInfo.dot}`}></span>
                      {qualityInfo.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {driftInfo.detected ? (
                      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        已拦截
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        正常
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedBuoy && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Waves className="w-5 h-5 text-ocean-500" />
            {selectedBuoy.buoyId} 详细信息
          </h3>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">实际位置</div>
              <div className="text-sm font-medium text-slate-800">
                {selectedBuoy.location.lat.toFixed(6)}, 
                {selectedBuoy.location.lng.toFixed(6)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">预期位置</div>
              <div className="text-sm font-medium text-slate-800">
                {selectedBuoy.expectedLocation.lat.toFixed(6)}, 
                {selectedBuoy.expectedLocation.lng.toFixed(6)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">漂移距离</div>
              <div className={`text-sm font-bold ${selectedBuoy.driftDetected ? 'text-red-600' : 'text-slate-800'}`}>
                {selectedBuoy.driftDistance.toFixed(3)} km
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">数据质量</div>
              <div className="text-sm font-medium text-slate-800">
                {getDataQualityInfo(selectedBuoy.dataQuality).label}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-ocean-50 rounded-lg p-3">
              <div className="text-xs text-ocean-600 mb-1">浪高</div>
              <div className="text-lg font-bold text-ocean-800">{selectedBuoy.waveHeight} m</div>
            </div>
            <div className="bg-ocean-50 rounded-lg p-3">
              <div className="text-xs text-ocean-600 mb-1">水深</div>
              <div className="text-lg font-bold text-ocean-800">{selectedBuoy.waterDepth} m</div>
            </div>
            <div className="bg-ocean-50 rounded-lg p-3">
              <div className="text-xs text-ocean-600 mb-1">流速</div>
              <div className="text-lg font-bold text-ocean-800">{selectedBuoy.currentSpeed} m/s</div>
            </div>
            <div className="bg-ocean-50 rounded-lg p-3">
              <div className="text-xs text-ocean-600 mb-1">水温</div>
              <div className="text-lg font-bold text-ocean-800">{selectedBuoy.waterTemperature} °C</div>
            </div>
          </div>

          <div className="mt-4 bg-sand-50 rounded-lg p-3">
            <div className="text-xs text-sand-700 mb-1">含沙浓度</div>
            <div className="text-lg font-bold text-sand-800">{selectedBuoy.sedimentConcentration} kg/m³</div>
          </div>

          {selectedBuoy.driftDetected && selectedBuoy.driftReason && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800">漂移原因</div>
                  <div className="text-sm text-red-700 mt-1">{selectedBuoy.driftReason}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
