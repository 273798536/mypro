import { useSceneStore } from "../../hooks/useSceneStore";
import { Filter, RotateCcw } from "lucide-react";
import type { FilterState } from "../../data/types";

const OBJECT_TYPES = [
  { value: "", label: "全部类型" },
  { value: "spot", label: "聚光灯" },
  { value: "point", label: "点光源" },
  { value: "ambient", label: "环境光" },
];

const ZONES = [
  { value: "", label: "全部区域" },
  { value: "一层-先秦厅", label: "一层-先秦厅" },
  { value: "一层-宋元厅", label: "一层-宋元厅" },
  { value: "二层-书画厅", label: "二层-书画厅" },
];

const MATERIAL_TYPES = [
  { value: "", label: "全部材料" },
  { value: "inspection_photo", label: "巡检照片" },
  { value: "retraction_record", label: "撤回记录" },
  { value: "verbal_note", label: "口头说明" },
];

export default function FilterBar() {
  const { filterState, setFilterState } = useSceneStore();

  const hasActiveFilter = filterState.objectType || filterState.zone || filterState.materialType;

  const update = (partial: Partial<FilterState>) => {
    setFilterState({ ...filterState, ...partial });
  };

  const reset = () => {
    setFilterState({ objectType: null, zone: null, materialType: null });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#12121E]/80 border-b border-zinc-800/60">
      <div className="flex items-center gap-1.5">
        <Filter size={13} className="text-copper" />
        <span className="text-[11px] text-zinc-500">筛选</span>
      </div>

      <select
        value={filterState.objectType || ""}
        onChange={(e) => update({ objectType: e.target.value || null })}
        className="bg-zinc-900/80 text-xs text-zinc-300 border border-zinc-700/50 rounded px-2 py-1 outline-none focus:border-copper/50 transition-colors"
      >
        {OBJECT_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filterState.zone || ""}
        onChange={(e) => update({ zone: e.target.value || null })}
        className="bg-zinc-900/80 text-xs text-zinc-300 border border-zinc-700/50 rounded px-2 py-1 outline-none focus:border-copper/50 transition-colors"
      >
        {ZONES.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select
        value={filterState.materialType || ""}
        onChange={(e) => update({ materialType: e.target.value || null })}
        className="bg-zinc-900/80 text-xs text-zinc-300 border border-zinc-700/50 rounded px-2 py-1 outline-none focus:border-copper/50 transition-colors"
      >
        {MATERIAL_TYPES.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {hasActiveFilter && (
        <button
          onClick={reset}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <RotateCcw size={11} />
          重置
        </button>
      )}
    </div>
  );
}
