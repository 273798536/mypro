import { FileCheck2, Thermometer, Waves, MapPin, AlertTriangle } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useSceneStore } from '../../store/sceneStore';
import ProfileCompare from './ProfileCompare';
import TimeAxis from './TimeAxis';
import ConclusionEditor from './ConclusionEditor';
import { formatCoordinate } from '../../utils/coordinateTransform';

export default function ReviewPanel() {
  const selectedId = useSceneStore((s) => s.selectedRecordId);
  const records = useDataStore((s) => s.records);
  const getProfiles = useDataStore((s) => s.getRecordProfiles);
  const thresholds = useDataStore((s) => s.thresholds);

  const selected = records.find((r) => r.id === selectedId);

  if (!selected) {
    return (
      <aside className="flex h-full w-96 flex-col border-l border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-[#FF6B35]" />
            <h2 className="text-sm font-bold tracking-wide text-slate-100">评审面板</h2>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full border border-slate-700 bg-slate-900/60 p-4">
            <MapPin size={28} className="text-slate-600" />
          </div>
          <p className="mb-1 text-sm text-slate-400">未选择数据记录</p>
          <p className="text-xs text-slate-500">
            在左侧列表或 3D 场景中点击数据点查看详情
          </p>
          <div className="mt-6 w-full space-y-2 rounded border border-slate-800 bg-slate-900/40 p-3 text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">阈值参考</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Thermometer size={12} className="text-[#FF6B35]" />
                <span className="text-[10px] text-slate-400">温度范围</span>
              </div>
              <span className="font-mono text-[10px] text-[#FF6B35]">
                {thresholds.temperatureMin}~{thresholds.temperatureMax}℃
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Waves size={12} className="text-[#00D4AA]" />
                <span className="text-[10px] text-slate-400">流速范围</span>
              </div>
              <span className="font-mono text-[10px] text-[#00D4AA]">
                {thresholds.flowRateMin}~{thresholds.flowRateMax} m/s
              </span>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const profiles = getProfiles(selected.id);

  return (
    <aside className="flex h-full w-96 flex-col border-l border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="border-b border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileCheck2 size={18} className="text-[#FF6B35]" />
          <h2 className="text-sm font-bold tracking-wide text-slate-100">评审面板</h2>
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            {selected.sourceFile}
            <span className="text-[#00D4AA]">#L{selected.sourceLine}</span>
          </span>
        </div>
        <div className="space-y-1.5 rounded border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">坐标</span>
            <span className="font-mono text-[10px] text-slate-300">
              [{selected.coordinateSystem}]
            </span>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-slate-200">
            {formatCoordinate(selected.coordinateSystem, selected.x, selected.y, selected.z_m)}
          </p>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="rounded bg-slate-800/60 px-2 py-1.5">
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
                <Thermometer size={9} /> 温度
              </div>
              <div
                className={`font-mono text-sm ${
                  selected.outOfBoundsFields?.includes('temperature') ? 'text-rose-400' : 'text-[#FF6B35]'
                }`}
              >
                {selected.temperature.toFixed(1)}℃
              </div>
            </div>
            <div className="rounded bg-slate-800/60 px-2 py-1.5">
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-slate-500">
                <Waves size={9} /> 流速
              </div>
              <div
                className={`font-mono text-sm ${
                  selected.outOfBoundsFields?.includes('flowRate') ? 'text-rose-400' : 'text-[#00D4AA]'
                }`}
              >
                {selected.flowRate.toFixed(2)}
              </div>
            </div>
            <div className="rounded bg-slate-800/60 px-2 py-1.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">版本</div>
              <div className="font-mono text-sm text-[#FFD93D]">{selected.version}</div>
            </div>
          </div>
          {selected.isOutOfBounds && (
            <div className="mt-2 flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5">
              <AlertTriangle size={11} className="text-rose-400" />
              <span className="text-[10px] text-rose-300">
                参数越界：{selected.outOfBoundsFields?.join(', ')}
              </span>
            </div>
          )}
          {selected.sourceNote && (
            <p className="border-t border-slate-700/50 pt-2 text-[10px] italic text-slate-500">
              📎 {selected.sourceNote}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <TimeAxis />
        <ProfileCompare profiles={profiles} />
        <ConclusionEditor record={selected} />
      </div>
    </aside>
  );
}
