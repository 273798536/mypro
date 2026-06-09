import { ChevronRight, AlertCircle, FileX } from "lucide-react";
import { useVolumeStore } from "@/store/useVolumeStore";
import { Material } from "@/types";

const BOUNDARY_LABELS: Record<string, string> = {
  empty: "空集合",
  zero_division: "除零边界",
  bad_data: "坏数据",
};

export default function MaterialList() {
  const { currentBatch, selectedMaterialId, setSelectedMaterialId } = useVolumeStore();

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card overflow-hidden animate-fadeUp" style={{ animationDelay: "240ms" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
        <h3 className="serif text-base font-semibold text-ink-800">材料清单（题目清单）</h3>
        <span className="mono text-xs text-ink-400">{currentBatch.materials.length} 条记录</span>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-50/60 sticky top-0 z-10">
            <tr className="text-left text-ink-500 serif text-xs">
              <th className="px-4 py-2.5 font-medium">材料名称</th>
              <th className="px-3 py-2.5 font-medium mono">长</th>
              <th className="px-3 py-2.5 font-medium mono">宽</th>
              <th className="px-3 py-2.5 font-medium mono">高</th>
              <th className="px-3 py-2.5 font-medium mono">数量</th>
              <th className="px-3 py-2.5 font-medium mono text-right">真实体积</th>
              <th className="px-3 py-2.5 font-medium mono text-right">近似体积</th>
              <th className="px-3 py-2.5 font-medium mono text-right">误差率</th>
              <th className="px-3 py-2.5 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {currentBatch.materials.map((m, i) => (
              <MaterialRow
                key={m.id}
                material={m}
                index={i}
                selected={selectedMaterialId === m.id}
                onSelect={() => setSelectedMaterialId(selectedMaterialId === m.id ? null : m.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MaterialRow({
  material, index, selected, onSelect,
}: {
  material: Material; index: number; selected: boolean; onSelect: () => void;
}) {
  const zebra = index % 2 === 0 ? "bg-white" : "bg-paper/40";
  let rowClass = `${zebra} border-b border-ink-50 group cursor-pointer hover:bg-amber-50/40 transition-colors`;
  let leftBorder = "";
  if (material.isBoundary) {
    rowClass += " bg-amber-50/30";
    leftBorder = "border-l-[3px] border-l-amber-400";
  }
  if (material.errorRate !== undefined && material.errorRate > 15) {
    rowClass += " bg-brick-50/40";
  }
  if (material.hasDraftGap) {
    rowClass += " bg-sand-50/50";
  }
  if (selected) {
    rowClass += " !bg-amber-100/50";
  }

  return (
    <tr className={`${rowClass} ${leftBorder}`} onClick={onSelect}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <ChevronRight className={`w-3 h-3 text-ink-300 transition-transform ${selected ? "rotate-90" : ""}`} />
          <span className="serif text-ink-800 text-[13px]">{material.name}</span>
          {material.isBoundary && (
            <span className="serif text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
              {BOUNDARY_LABELS[material.boundaryType ?? ""]}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 mono text-ink-600 text-xs">{material.length ?? "—"}</td>
      <td className="px-3 py-2.5 mono text-ink-600 text-xs">{material.width ?? "—"}</td>
      <td className="px-3 py-2.5 mono text-ink-600 text-xs">{material.height ?? "—"}</td>
      <td className="px-3 py-2.5 mono text-ink-600 text-xs">{material.quantity ?? "—"}</td>
      <td className="px-3 py-2.5 mono text-ink-500 text-xs text-right">
        {material.realVolume !== null ? material.realVolume.toLocaleString() : "—"}
      </td>
      <td className="px-3 py-2.5 mono text-ink-800 text-xs text-right font-medium">
        {material.approxVolume !== undefined ? material.approxVolume.toLocaleString() : "—"}
      </td>
      <td className="px-3 py-2.5 mono text-xs text-right">
        {material.errorRate !== undefined ? (
          <span className={material.errorRate > 15 ? "text-brick-500 font-semibold" : "text-mist-500"}>
            {material.errorRate}%
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {material.hasDraftGap && (
            <FileX className="w-3.5 h-3.5 text-amber-500" />
          )}
          {material.errorRate !== undefined && material.errorRate > 15 && (
            <AlertCircle className="w-3.5 h-3.5 text-brick-500" />
          )}
        </div>
      </td>
    </tr>
  );
}
