import { Settings, Layers, AlertTriangle } from 'lucide-react';
import useAppStore from '@/store/useAppStore';

export default function ControlPanel() {
  const slopeThreshold = useAppStore((state) => state.slopeThreshold);
  const rainfallThreshold = useAppStore((state) => state.rainfallThreshold);
  const showDuplicateCracks = useAppStore((state) => state.showDuplicateCracks);
  const showMissingRainfall = useAppStore((state) => state.showMissingRainfall);
  const showCoordinateErrors = useAppStore((state) => state.showCoordinateErrors);
  const showDevices = useAppStore((state) => state.showDevices);
  const showHouseholds = useAppStore((state) => state.showHouseholds);
  const showCracks = useAppStore((state) => state.showCracks);

  const setSlopeThreshold = useAppStore((state) => state.setSlopeThreshold);
  const setRainfallThreshold = useAppStore((state) => state.setRainfallThreshold);
  const setShowDuplicateCracks = useAppStore((state) => state.setShowDuplicateCracks);
  const setShowMissingRainfall = useAppStore((state) => state.setShowMissingRainfall);
  const setShowCoordinateErrors = useAppStore((state) => state.setShowCoordinateErrors);
  const setShowDevices = useAppStore((state) => state.setShowDevices);
  const setShowHouseholds = useAppStore((state) => state.setShowHouseholds);
  const setShowCracks = useAppStore((state) => state.setShowCracks);

  return (
    <div className="w-72 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Settings size={18} />
          参数控制
        </h2>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
            <Layers size={14} />
            图层显示
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showDevices}
                onChange={(e) => setShowDevices(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">监测设备</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showCracks}
                onChange={(e) => setShowCracks(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">裂缝点</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showHouseholds}
                onChange={(e) => setShowHouseholds(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">住户位置</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            数据问题显示
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showDuplicateCracks}
                onChange={(e) => setShowDuplicateCracks(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">重复裂缝记录</span>
              <span className="text-purple-400 text-xs">(紫色标记)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showMissingRainfall}
                onChange={(e) => setShowMissingRainfall(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">雨量缺测标记</span>
              <span className="text-red-400 text-xs">(红色柱)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showCoordinateErrors}
                onChange={(e) => setShowCoordinateErrors(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
              />
              <span className="text-slate-300 text-sm">坐标偏差连线</span>
              <span className="text-amber-400 text-xs">(黄色线)</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-3">风险阈值设置</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-400 text-sm">坡度阈值</label>
                <span className="text-blue-400 text-sm font-mono">{slopeThreshold}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                value={slopeThreshold}
                onChange={(e) => setSlopeThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>15°</span>
                <span>60°</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-400 text-sm">雨量阈值</label>
                <span className="text-blue-400 text-sm font-mono">{rainfallThreshold}mm</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={rainfallThreshold}
                onChange={(e) => setRainfallThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>20mm</span>
                <span>200mm</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-slate-300 text-sm font-medium mb-3">图例</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-slate-400">低风险区域</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-slate-400">中风险区域</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-slate-400">高风险区域</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-400">极高风险区域</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-slate-400">裂缝点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-slate-400">重复裂缝</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-slate-400">正常住户</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-400">坐标偏差住户</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
