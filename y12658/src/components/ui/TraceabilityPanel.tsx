import { useMemo } from 'react';
import { Link2, FileText, Hash, Calendar, MapPin, AlertOctagon, Check } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useViewStore } from '@/store/useViewStore';

export default function TraceabilityPanel() {
  const records = useDataStore((s) => s.records);
  const selectedId = useDataStore((s) => s.selectedRecordId);
  const setSelected = useDataStore((s) => s.setSelectedRecord);
  const setCamera = useViewStore((s) => s.setCamera);
  const resolveAbnormal = useDataStore((s) => s.resolveAbnormal);
  const setConclusion = useDataStore((s) => s.setConclusion);

  const selected = useMemo(() => records.find((r) => r.id === selectedId), [records, selectedId]);
  const abnormalRecords = useMemo(
    () => records.filter((r) => r.abnormalFlags.some((f) => !f.resolved)),
    [records]
  );

  const locateInScene = (r: typeof records[number]) => {
    setSelected(r.id);
    const dist = 3.5;
    setCamera(
      { x: r.x + dist, y: r.y + dist * 0.7, z: r.z + dist },
      { x: r.x, y: r.y, z: r.z }
    );
  };

  return (
    <div className="panel-ocean p-3 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-data-cyan" />
        <span className="text-sm font-semibold text-slate-200">记录溯源</span>
        {abnormalRecords.length > 0 && (
          <span className="chip-ocean text-data-red border-data-red/40">{abnormalRecords.length} 待复核</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto pr-1 space-y-1.5">
        {records.length === 0 && (
          <div className="text-xs text-slate-500 py-4 text-center">暂无数据，请先导入</div>
        )}
        {(abnormalRecords.length > 0 ? abnormalRecords : records).slice(0, 60).map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r.id === selectedId ? null : r.id)}
            className={`rounded border text-[11px] cursor-pointer transition-all ${
              r.id === selectedId
                ? 'border-data-cyan/60 bg-data-cyan/5 shadow-glow-cyan'
                : 'border-ocean-700 bg-ocean-800/40 hover:border-ocean-500'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1 gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <Hash className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="font-mono text-slate-300 truncate">{r.deviceId}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.abnormalFlags.filter((f) => !f.resolved).map((f) => (
                  <span
                    key={f.type}
                    className={`px-1 py-0.5 rounded text-[9px] font-mono ${
                      f.type === 'OUT_OF_BOUNDS'
                        ? 'bg-data-red/20 text-data-red'
                        : f.type === 'COORDINATE_MIX'
                        ? 'bg-data-orange/20 text-data-orange'
                        : 'bg-data-purple/20 text-data-purple'
                    }`}
                  >
                    {f.type === 'OUT_OF_BOUNDS' ? '越界' : f.type === 'COORDINATE_MIX' ? '坐标混用' : '重复'}
                  </span>
                ))}
                <button
                  className="p-0.5 text-slate-500 hover:text-data-cyan"
                  onClick={(e) => { e.stopPropagation(); locateInScene(r); }}
                  title="在场景中定位"
                >
                  <MapPin className="w-3 h-3" />
                </button>
              </div>
            </div>
            {r.id === selectedId && (
              <div className="border-t border-ocean-700 px-2 py-2 space-y-1.5 bg-ocean-900/60">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <div className="flex items-center gap-1 text-slate-400">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{r.sourceMeta.sourceFileName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Hash className="w-3 h-3" />
                    <span>原始行号:</span>
                    <span className="font-mono text-data-cyan">#{r.sourceMeta.originalLineNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span className="truncate font-mono">{r.timestamp.slice(5, 16)}</span>
                  </div>
                  <div className="text-slate-400">
                    坐标: <span className="font-mono text-slate-200">({r.x}, {r.y}, {r.z})</span>
                  </div>
                  <div className="text-slate-400 col-span-2">
                    批次: <span className="font-mono text-slate-300">{r.sourceMeta.importBatchId}</span>
                  </div>
                  {r.sourceMeta.remark && (
                    <div className="text-slate-400 col-span-2">
                      备注: <span className="text-data-orange">{r.sourceMeta.remark}</span>
                    </div>
                  )}
                </div>
                {r.abnormalFlags.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-ocean-700">
                    {r.abnormalFlags.map((f) => (
                      <div key={f.type} className="flex items-start justify-between gap-1 text-[10px]">
                        <div className="flex items-start gap-1 text-slate-300">
                          <AlertOctagon className="w-3 h-3 mt-0.5 text-data-orange shrink-0" />
                          <span>{f.detail}</span>
                        </div>
                        {!f.resolved && (
                          <button
                            className="shrink-0 flex items-center gap-0.5 text-[10px] text-data-green hover:underline"
                            onClick={(e) => { e.stopPropagation(); resolveAbnormal(r.id, f.type); }}
                          >
                            <Check className="w-3 h-3" />
                            标记已复核
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-1 border-t border-ocean-700">
                  <div className="text-[10px] text-slate-400 mb-1">评审结论</div>
                  <input
                    className="w-full bg-ocean-800 border border-ocean-600 rounded px-2 py-1 text-[11px] text-slate-200 outline-none focus:border-data-cyan"
                    value={r.conclusion ?? ''}
                    placeholder="输入结论..."
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setConclusion(r.id, e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
