import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import type { NoisePointGroup, MergeStatus } from "@/types";
import { STATUS_COLOR } from "@/types";
import { StatusBadge, LateBadge, RiskLevelBadge } from "@/components/ui/Badges";
import { useAppStore } from "@/store/useAppStore";
import { Eye, ChevronRight, CheckSquare, Square, MapPin } from "lucide-react";

interface Props {
  group: NoisePointGroup;
  index: number;
}

export function GroupTableRow({ group, index }: Props) {
  const navigate = useNavigate();
  const allVariants = useAppStore((s) => s.variants);
  const selectedGroupIds = useAppStore((s) => s.selectedGroupIds);
  const toggle = useAppStore((s) => s.toggleSelectGroup);
  const allRisks = useAppStore((s) => s.adjacentRisks);

  const variants = useMemo(
    () => allVariants.filter((v) => v.groupId === group.groupId),
    [allVariants, group.groupId]
  );
  const selected = useMemo(
    () => selectedGroupIds.includes(group.groupId),
    [selectedGroupIds, group.groupId]
  );
  const hasLate = useMemo(
    () => variants.some((v) => v.isLateAttachment),
    [variants]
  );
  const riskPair = useMemo(
    () =>
      allRisks.find(
        (r) => r.groupA === group.groupId || r.groupB === group.groupId
      ),
    [allRisks, group.groupId]
  );

  return (
    <tr
      className={clsx(
        "group border-b border-neutral-100 hover:bg-civic-50/40 transition-colors cursor-pointer animate-fade-up",
        selected && "bg-civic-50/60"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={() => navigate(`/merge/${group.groupId}`)}
    >
      <td
        className="w-1 py-0"
        style={{ backgroundColor: STATUS_COLOR[group.status as MergeStatus] }}
      />
      <td className="w-10 py-3 px-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => toggle(group.groupId)}
          className="text-neutral-400 hover:text-civic-600 transition-colors"
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-civic-600 fill-civic-100" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </td>
      <td className="py-3 px-2 font-mono text-xs text-neutral-500">
        {group.groupId}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-civic-600 shrink-0" />
          <span className="font-medium text-neutral-900 truncate">
            {group.canonicalName}
          </span>
          {hasLate && <LateBadge />}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {variants.slice(0, 4).map((v) => (
            <span
              key={v.variantId}
              className={clsx(
                "text-[11px] px-1.5 py-0.5 rounded-civic border",
                v.isLateAttachment
                  ? "border-late-300 bg-late-50 text-late-700"
                  : "border-neutral-200 bg-white text-neutral-600"
              )}
            >
              {v.variantText}
            </span>
          ))}
          {variants.length > 4 && (
            <span className="text-[11px] px-1.5 py-0.5 text-neutral-400">
              +{variants.length - 4}种写法
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-2">
        <StatusBadge status={group.status as MergeStatus} />
      </td>
      <td className="py-3 px-2">
        <RiskLevelBadge level={group.riskLevel} />
        {riskPair && !riskPair.reviewed && (
          <div className="mt-1 text-[10px] text-risk-600 font-mono">
            与{riskPair.groupA === group.groupId ? riskPair.groupB : riskPair.groupA}距离{riskPair.distanceMeters}米
          </div>
        )}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-civic-500"
              style={{ width: `${group.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-neutral-600 w-10 text-right">
            {Math.round(group.confidence * 100)}%
          </span>
        </div>
      </td>
      <td className="py-3 px-2 text-sm text-neutral-600 font-mono text-center">
        {group.variantCount}
      </td>
      <td className="py-3 px-2 text-sm text-neutral-600 font-mono text-center">
        {group.evidenceCount}
      </td>
      <td className="py-3 px-2 text-xs text-neutral-500 font-mono">
        {group.updatedAt.replace("T", " ").slice(5, 16)}
      </td>
      <td className="py-3 px-2 w-16" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => navigate(`/merge/${group.groupId}`)}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-civic text-civic-600 hover:bg-civic-100 text-xs transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          详情
          <ChevronRight className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}
