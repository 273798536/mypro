import { AlertTriangle, FileWarning, MapPin, CloudRain, Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import useAppStore from '@/store/useAppStore';
import { crackPoints, rainfallData, households } from '@/data/mockData';

export default function RiskPanel() {
  const currentTimeIndex = useAppStore((state) => state.currentTimeIndex);
  const showDuplicateCracks = useAppStore((state) => state.showDuplicateCracks);
  const showMissingRainfall = useAppStore((state) => state.showMissingRainfall);
  const showCoordinateErrors = useAppStore((state) => state.showCoordinateErrors);
  const slopeThreshold = useAppStore((state) => state.slopeThreshold);
  const rainfallThreshold = useAppStore((state) => state.rainfallThreshold);

  const [expandedIssue, setExpandedIssue] = useState<string | null>('duplicate');

  const stats = useMemo(() => {
    const duplicateCracks = crackPoints.filter((c) => c.isDuplicate);
    const missingRainfall = rainfallData.filter((r) => r.isMissing);
    const coordinateErrors = households.filter((h) => h.hasCoordinateError);

    const currentRainfall = rainfallData[currentTimeIndex];
    const isRainfallMissing = currentRainfall?.isMissing;
    const rainfallRisk = currentRainfall && !currentRainfall.isMissing && currentRainfall.rainfall > rainfallThreshold;

    return {
      duplicateCracks,
      missingRainfall,
      coordinateErrors,
      isRainfallMissing,
      rainfallRisk,
      currentRainfall,
    };
  }, [currentTimeIndex, rainfallThreshold]);

  return (
    <div className="absolute top-4 left-4 w-80 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-400" />
          数据问题说明
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          展示排查数据中常见的对账和对齐问题
        </p>
      </div>

      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        <div
          className={`rounded-lg border transition-all cursor-pointer ${
            stats.duplicateCracks.length > 0
              ? 'bg-purple-500/10 border-purple-500/30'
              : 'bg-slate-700/30 border-slate-600/30'
          }`}
          onClick={() => setExpandedIssue(expandedIssue === 'duplicate' ? null : 'duplicate')}
        >
          <div className="p-3 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${stats.duplicateCracks.length > 0 ? 'bg-purple-500/20' : 'bg-slate-600/30'}`}>
              <FileWarning size={16} className={stats.duplicateCracks.length > 0 ? 'text-purple-400' : 'text-slate-500'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${stats.duplicateCracks.length > 0 ? 'text-purple-300' : 'text-slate-500'}`}>
                  裂缝重复记录
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stats.duplicateCracks.length > 0
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-slate-600/30 text-slate-500'
                }`}>
                  {stats.duplicateCracks.length} 处
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">同一位置多次上报</p>
            </div>
          </div>
          {expandedIssue === 'duplicate' && stats.duplicateCracks.length > 0 && (
            <div className="px-3 pb-3 pt-1 border-t border-purple-500/20">
              <div className="text-xs text-slate-400 mb-2">
                <strong>问题说明:</strong> 野外排查时，不同队员可能在相近位置记录同一裂缝，导致数据重复。在3D视图中以紫色标记显示。
              </div>
              <div className="text-xs text-slate-400 mb-2">
                <strong>影响:</strong> 重复记录会夸大裂缝密度，导致风险评估偏高。
              </div>
              <div className="text-xs text-slate-400">
                <strong>处理建议:</strong> 结合坐标和拍摄照片进行比对，合并重复记录。
              </div>
              <div className="mt-2 pt-2 border-t border-purple-500/20">
                <div className="text-xs text-slate-500 mb-1">重复记录列表:</div>
                {stats.duplicateCracks.map((crack) => (
                  <div key={crack.id} className="text-xs text-purple-400 py-0.5">
                    • {crack.id} 与 {crack.duplicateWith} 重复
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={`rounded-lg border transition-all cursor-pointer ${
            stats.isRainfallMissing
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-slate-700/30 border-slate-600/30'
          }`}
          onClick={() => setExpandedIssue(expandedIssue === 'rainfall' ? null : 'rainfall')}
        >
          <div className="p-3 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${stats.isRainfallMissing ? 'bg-red-500/20' : 'bg-slate-600/30'}`}>
              <CloudRain size={16} className={stats.isRainfallMissing ? 'text-red-400' : 'text-slate-500'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${stats.isRainfallMissing ? 'text-red-300' : 'text-slate-500'}`}>
                  雨量数据缺测
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stats.isRainfallMissing
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-slate-600/30 text-slate-500'
                }`}>
                  {stats.missingRainfall.length} 天
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">雨量站数据中断</p>
            </div>
          </div>
          {expandedIssue === 'rainfall' && (
            <div className="px-3 pb-3 pt-1 border-t border-red-500/20">
              <div className="text-xs text-slate-400 mb-2">
                <strong>问题说明:</strong> 雨量站可能因供电、通讯或设备故障导致数据缺测。在时间轴上以红色柱标记。
              </div>
              <div className="text-xs text-slate-400 mb-2">
                <strong>当前状态:</strong> {stats.currentRainfall?.timestamp} - {
                  stats.isRainfallMissing
                    ? <span className="text-red-400">数据缺测</span>
                    : <span className="text-green-400">数据正常</span>
                }
              </div>
              <div className="text-xs text-slate-400">
                <strong>处理建议:</strong> 采用邻近站点插值法或历史同期平均值进行填补，但需在报告中明确标注。
              </div>
              {stats.rainfallRisk && (
                <div className="mt-2 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                  <div className="text-xs text-orange-400">
                    ⚠️ 当前雨量 ({stats.currentRainfall?.rainfall}mm) 超过阈值 ({rainfallThreshold}mm)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`rounded-lg border transition-all cursor-pointer ${
            stats.coordinateErrors.length > 0
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-slate-700/30 border-slate-600/30'
          }`}
          onClick={() => setExpandedIssue(expandedIssue === 'coordinate' ? null : 'coordinate')}
        >
          <div className="p-3 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${stats.coordinateErrors.length > 0 ? 'bg-amber-500/20' : 'bg-slate-600/30'}`}>
              <MapPin size={16} className={stats.coordinateErrors.length > 0 ? 'text-amber-400' : 'text-slate-500'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${stats.coordinateErrors.length > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                  住户坐标偏差
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stats.coordinateErrors.length > 0
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-600/30 text-slate-500'
                }`}>
                  {stats.coordinateErrors.length} 户
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">上报位置与实际不符</p>
            </div>
          </div>
          {expandedIssue === 'coordinate' && stats.coordinateErrors.length > 0 && (
            <div className="px-3 pb-3 pt-1 border-t border-amber-500/20">
              <div className="text-xs text-slate-400 mb-2">
                <strong>问题说明:</strong> 住户自报位置与现场GPS测量存在偏差，可能导致受影响户统计错误。开启显示后，黄线连接上报位置和实际位置。
              </div>
              <div className="text-xs text-slate-400 mb-2">
                <strong>影响:</strong> 坐标偏差可能导致受威胁住户统计遗漏或重复。
              </div>
              <div className="text-xs text-slate-400">
                <strong>处理建议:</strong> 以现场实测坐标为准，重新核对住户清单。
              </div>
              <div className="mt-2 pt-2 border-t border-amber-500/20">
                <div className="text-xs text-slate-500 mb-1">偏差住户列表:</div>
                {stats.coordinateErrors.map((household) => (
                  <div key={household.id} className="text-xs text-amber-400 py-0.5">
                    • {household.name} - 偏差约 {Math.sqrt(
                      Math.pow(household.actualPosition[0] - household.reportedPosition[0], 2) +
                      Math.pow(household.actualPosition[2] - household.reportedPosition[2], 2)
                    ).toFixed(1)}m
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 mb-2">当前风险参数</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-slate-500">坡度阈值</div>
            <div className="text-white font-mono">{slopeThreshold}°</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-slate-500">雨量阈值</div>
            <div className="text-white font-mono">{rainfallThreshold}mm</div>
          </div>
        </div>
      </div>
    </div>
  );
}
