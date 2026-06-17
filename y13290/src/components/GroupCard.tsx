import { useState } from "react";
import { MapPin, X, MessageSquareText } from "lucide-react";
import type { MergeGroup } from "@/types";
import { useStore, getGroupAnomalies } from "@/store";
import { cn } from "@/lib/utils";
import AnomalyTags from "@/components/AnomalyTag";

function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

interface GroupCardProps {
  group: MergeGroup;
}

export default function GroupCard({ group }: GroupCardProps) {
  const patchGroup = useStore((s) => s.patchGroup);
  const ungroupEntry = useStore((s) => s.ungroupEntry);
  const showToast = useStore((s) => s.showToast);

  const [mergedName, setMergedName] = useState(group.merged_name);
  const [remark, setRemark] = useState(group.remark);
  const [saving, setSaving] = useState(false);

  const flags = getGroupAnomalies(group);
  const anomaliesCount = flags.filter((f) => f.nameInconsistent || f.coordOffset).length;

  const saveField = async (field: "merged_name" | "remark", value: string) => {
    if (group[field] === value) return;
    setSaving(true);
    try {
      await patchGroup(group.id, { [field]: value });
      showToast("已同步后端");
    } catch {
      showToast("同步失败");
      if (field === "merged_name") setMergedName(group.merged_name);
      else setRemark(group.remark);
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "rounded px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30";

  return (
    <div className="animate-fade-in overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-white">
            组 #{group.id}
          </span>
          <input
            value={mergedName}
            onChange={(e) => setMergedName(e.target.value)}
            onBlur={() => saveField("merged_name", mergedName)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={cn(inputBase, "text-base font-semibold text-slate-800")}
          />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} className="text-amber-500" />
            {formatCoord(group.merged_latitude, group.merged_longitude)}
          </span>
          <span className="text-slate-300">|</span>
          <span>{group.entries.length} 条原始记录</span>
          {anomaliesCount > 0 && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">
              {anomaliesCount} 处异常
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-slate-500">备注</span>
          <input
            value={remark}
            placeholder="点击编辑备注，失焦后自动同步后端"
            onChange={(e) => setRemark(e.target.value)}
            onBlur={() => saveField("remark", remark)}
            className={cn(inputBase, "min-w-0 flex-1 text-slate-700")}
          />
          {saving && <span className="text-xs text-emerald-500">同步中…</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2 font-medium">名称</th>
              <th className="px-3 py-2 font-medium">坐标</th>
              <th className="px-3 py-2 font-medium">意见</th>
              <th className="px-3 py-2 font-medium">来源</th>
              <th className="px-3 py-2 font-medium">异常标记</th>
              <th className="px-5 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {group.entries.map((entry, idx) => (
              <tr key={entry.id} className="row-hover border-b border-slate-50 align-top">
                <td className="px-5 py-2.5 font-medium text-slate-700">{entry.name}</td>
                <td className="px-3 py-2.5 text-slate-500">{formatCoord(entry.latitude, entry.longitude)}</td>
                <td className="px-3 py-2.5 text-slate-600">{entry.opinion}</td>
                <td className="px-3 py-2.5 text-slate-500">{entry.source}</td>
                <td className="px-3 py-2.5">
                  <AnomalyTags flags={flags[idx]} />
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    onClick={() => ungroupEntry(entry.id)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={12} />
                    移出
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <MessageSquareText size={13} />
          原始说法
        </p>
        <ul className="space-y-1.5">
          {group.entries.map((entry) => (
            <li key={entry.id} className="text-sm text-slate-600">
              <span className="text-slate-800">{entry.opinion}</span>
              <span className="ml-2 text-xs text-slate-400">— {entry.source}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
