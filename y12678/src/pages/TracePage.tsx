import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import TraceTimeline from "@/components/trace/TraceTimeline";
import CoordMismatchSearch from "@/components/trace/CoordMismatchSearch";
import { useAppStore } from "@/store/useAppStore";

export default function TracePage() {
  const [searchParams] = useSearchParams();
  const {
    collisionResults,
    selectedCollisionId,
    getRecordsByIds,
    getSupplementByRecordId,
    measurementRecords,
  } = useAppStore();

  const collisionId = searchParams.get("collisionId") || selectedCollisionId;
  const recordId = searchParams.get("recordId");

  const activeCollision = useMemo(() => {
    if (collisionId) return collisionResults.find((c) => c.id === collisionId) || null;
    if (recordId) {
      return collisionResults.find((c) => c.relatedRecordIds.includes(recordId)) || null;
    }
    return collisionResults[0];
  }, [collisionId, recordId, collisionResults]);

  const relatedRecords = useMemo(() => {
    if (activeCollision) return getRecordsByIds(activeCollision.relatedRecordIds);
    if (recordId) {
      const r = measurementRecords.find((m) => m.id === recordId);
      return r ? [r] : [];
    }
    return [];
  }, [activeCollision, recordId, getRecordsByIds, measurementRecords]);

  const supplementsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    relatedRecords.forEach((r) => {
      map[r.id] = getSupplementByRecordId(r.id);
    });
    return map;
  }, [relatedRecords, getSupplementByRecordId]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="溯源追踪"
        subtitle="结论 → 检测 → 记录 → 来源 · 验收倒查专用"
      >
        <button className="btn-secondary">
          <Download className="h-4 w-4" />
          导出溯源报告
        </button>
      </PageHeader>

      <div className="flex-1 grid grid-cols-1 gap-5 p-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <CoordMismatchSearch />

          <div className="eng-card p-4">
            <h4 className="mb-3 font-song text-sm font-semibold text-ocean-700">
              历史结论（点击查看溯源）
            </h4>
            <div className="space-y-2">
              {collisionResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("collisionId", c.id);
                    window.history.replaceState({}, "", url.toString());
                  }}
                  className={`w-full rounded border p-2.5 text-left transition-all ${
                    activeCollision?.id === c.id
                      ? "border-ocean-400 bg-ocean-50 shadow-sm"
                      : "border-ocean-100 bg-white hover:border-ocean-200 hover:bg-ocean-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num text-sm font-semibold text-ocean-800">
                      {c.cageA} ↔ {c.cageB}
                    </span>
                    <span
                      className={`font-mono-num text-[10px] ${
                        c.distance < 18 ? "text-coral-600 font-semibold" : "text-amber-600"
                      }`}
                    >
                      {c.distance}m
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">{c.conclusion}</p>
                  <p className="text-[10px] text-gray-400 font-mono-num">{c.detectedAt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <TraceTimeline
            collision={activeCollision || null}
            records={relatedRecords}
            supplementsMap={supplementsMap}
          />
        </div>
      </div>
    </div>
  );
}
