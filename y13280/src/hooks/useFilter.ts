import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MergeStatus, NoisePointGroup } from "@/types";

export function useFilteredGroups(): NoisePointGroup[] {
  const groups = useAppStore((s) => s.groups);
  const filter = useAppStore((s) => s.filter);
  return useMemo(() => {
    return groups.filter((g) => {
      if (
        filter.statuses.length > 0 &&
        !filter.statuses.includes(g.status as MergeStatus)
      )
        return false;
      if (
        filter.riskLevels.length > 0 &&
        !filter.riskLevels.includes(g.riskLevel)
      )
        return false;
      if (filter.keyword.trim()) {
        const kw = filter.keyword.trim().toLowerCase();
        const hay = `${g.groupId} ${g.canonicalName} ${g.latitude.toFixed(
          3
        )} ${g.longitude.toFixed(3)}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (filter.dateRange) {
        const t = new Date(g.updatedAt).getTime();
        const a = new Date(filter.dateRange[0]).getTime();
        const b = new Date(filter.dateRange[1]).getTime();
        if (t < a || t > b) return false;
      }
      return true;
    });
  }, [groups, filter]);
}

export function useStatusCounts() {
  const groups = useAppStore((s) => s.groups);
  return useMemo(() => {
    const counts = { merged: 0, pending: 0, doubtful: 0, risk: 0 };
    groups.forEach((g) => (counts[g.status] += 1));
    return counts;
  }, [groups]);
}

export function useHeatmapData() {
  const groups = useAppStore((s) => s.groups);
  const variants = useAppStore((s) => s.variants);
  return useMemo(() => {
    return groups
      .filter((g) => g.status === "risk" || g.status === "doubtful")
      .map((g) => ({
        groupId: g.groupId,
        name: g.canonicalName,
        status: g.status,
        hasLateAttachment: variants
          .filter((v) => v.groupId === g.groupId)
          .some((v) => v.isLateAttachment),
      }));
  }, [groups, variants]);
}

export function useUniqueOperators(): string[] {
  const records = useAppStore((s) => s.historyRecords);
  return useMemo(
    () => Array.from(new Set(records.map((r) => r.operator))),
    [records]
  );
}
