import { useEffect, useState, useMemo } from 'react';
import { Database, Filter, AlertTriangle, Copy, RefreshCw, Layers } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import { useSceneStore } from '../../store/sceneStore';
import DataCard from '../common/DataCard';
import { transformToScene } from '../../utils/coordinateTransform';
import type { DataRecord } from '../../types';
import { useCameraAnimation } from '../../hooks/useCameraAnimation';

interface Props {
  cameraRef: React.MutableRefObject<any>;
}

type CoordFilter = 'ALL' | 'WGS84' | 'UTM51N' | 'LOCAL';
type StatusFilter = 'ALL' | 'pending' | 'approved' | 'disputed';

export default function DataPanel({ cameraRef }: Props) {
  const initIfEmpty = useDataStore((s) => s.initIfEmpty);
  const allRecords = useDataStore((s) => s.records);
  const activeCoord = useDataStore((s) => s.activeCoordinateSystem) as CoordFilter;
  const statusFilter = useDataStore((s) => s.filterStatus) as StatusFilter;
  const showDup = useDataStore((s) => s.showDuplicates);
  const showOob = useDataStore((s) => s.showOutOfBounds);
  const setActiveCoord = useDataStore((s) => s.setActiveCoordinateSystem);
  const setStatus = useDataStore((s) => s.setFilterStatus);
  const toggleDup = useDataStore((s) => s.toggleShowDuplicates);
  const toggleOob = useDataStore((s) => s.toggleShowOutOfBounds);
  const runDupCheck = useDataStore((s) => s.runDuplicateCheck);
  const mergeDup = useDataStore((s) => s.mergeDuplicate);

  const selectedId = useSceneStore((s) => s.selectedRecordId);
  const selectRecord = useSceneStore((s) => s.selectRecord);
  const [localSel, setLocalSel] = useState<string | null>(selectedId);
  const { animateTo } = useCameraAnimation(cameraRef);

  const records = useMemo(() => {
    return allRecords.filter((r) => {
      if (activeCoord !== 'ALL' && r.coordinateSystem !== activeCoord) return false;
      if (statusFilter !== 'ALL' && r.reviewStatus !== statusFilter) return false;
      if (!showDup && r.isDuplicate) return false;
      if (!showOob && r.isOutOfBounds) return false;
      return true;
    });
  }, [allRecords, activeCoord, statusFilter, showDup, showOob]);

  const oobCount = useMemo(() => allRecords.filter((r) => r.isOutOfBounds).length, [allRecords]);
  const dupCount = useMemo(() => allRecords.filter((r) => r.isDuplicate).length, [allRecords]);

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  useEffect(() => {
    setLocalSel(selectedId);
  }, [selectedId]);

  const handleClick = (rec: DataRecord) => {
    selectRecord(rec);
    const p = transformToScene(rec.x, rec.y, rec.z_m, rec.coordinateSystem);
    animateTo({
      position: { x: p.x + 30, y: p.y + 25, z: p.z + 30 },
      target: { x: p.x, y: p.y, z: p.z },
    });
  };

  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm">
      <div className="border-b border-slate-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Database size={18} className="text-[#00D4AA]" />
          <h2 className="text-sm font-bold tracking-wide text-slate-100">数据记录</h2>
          <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
            {records.length}/{allRecords.length}
          </span>
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          <Filter size={12} className="text-slate-500" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">坐标系</span>
        </div>
        <div className="mb-3 flex gap-1">
          {(['ALL', 'WGS84', 'UTM51N', 'LOCAL'] as CoordFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCoord(c)}
              className={`flex-1 rounded border px-2 py-1 font-mono text-[10px] transition-all ${
                activeCoord === c
                  ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                  : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
              }`}
            >
              {c === 'ALL' ? '全部' : c}
            </button>
          ))}
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          <Layers size={12} className="text-slate-500" />
          <span className="text-[10px] uppercase tracking-wider text-slate-500">评审状态</span>
        </div>
        <div className="mb-3 flex gap-1">
          {(['ALL', 'pending', 'approved', 'disputed'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`flex-1 rounded border px-1 py-1 text-[10px] transition-all ${
                statusFilter === st
                  ? 'border-[#00D4AA] bg-[#00D4AA]/15 text-[#00D4AA]'
                  : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
              }`}
            >
              {st === 'ALL' ? '全部' : st === 'pending' ? '待复核' : st === 'approved' ? '通过' : '异议'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleDup}
            className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[10px] transition-all ${
              showDup
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-500'
            }`}
          >
            <Copy size={11} /> 重复 {dupCount}
          </button>
          <button
            onClick={toggleOob}
            className={`flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1.5 text-[10px] transition-all ${
              showOob
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-500'
            }`}
          >
            <AlertTriangle size={11} /> 越界 {oobCount}
          </button>
          <button
            onClick={runDupCheck}
            className="flex items-center justify-center rounded border border-slate-700 bg-slate-800/40 p-1.5 text-slate-400 transition-all hover:border-slate-600 hover:text-slate-200"
            title="重新检查重复数据"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2.5">
          {records.map((r) => (
            <div key={r.id} className="relative">
              <DataCard record={r} isSelected={localSel === r.id} onClick={() => handleClick(r)} />
              {r.isDuplicate && r.duplicateOf && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('合并此重复记录到原记录？')) mergeDup(r.id, r.duplicateOf!);
                  }}
                  className="absolute bottom-2 right-2 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400 opacity-0 transition-opacity hover:bg-amber-500/20 group-hover:opacity-100"
                >
                  合并
                </button>
              )}
            </div>
          ))}
          {records.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-500">
              暂无匹配数据，请调整筛选条件
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
