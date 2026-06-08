import { useState, useMemo } from "react";
import { Search, Filter, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import RecordTable from "@/components/record/RecordTable";
import SupplementSidebar from "@/components/record/SupplementSidebar";
import { useAppStore } from "@/store/useAppStore";
import type { MeasurementRecord, CoordinateSystem } from "@/types";

export default function RecordPage() {
  const navigate = useNavigate();
  const {
    measurementRecords,
    viewSnapshots,
    activeSnapshotId,
    getSupplementByRecordId,
    setSelectedRecordId,
    selectedRecordId,
  } = useAppStore();

  const [keyword, setKeyword] = useState("");
  const [coordFilter, setCoordFilter] = useState<CoordinateSystem | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "out-of-bounds" | "pending">("all");
  const [selectedRecord, setSelectedRecord] = useState<MeasurementRecord | null>(null);

  const coordSystems = useMemo(() => {
    const set = new Set(measurementRecords.map((r) => r.coordinateSystem));
    return set.size > 1;
  }, [measurementRecords]);

  const activeSnapshot = viewSnapshots.find((s) => s.id === activeSnapshotId);

  const records = useMemo(() => {
    let list = measurementRecords;
    if (activeSnapshotId) {
      const snap = viewSnapshots.find((s) => s.id === activeSnapshotId);
      if (snap) list = list.filter((r) => snap.recordIds.includes(r.id));
    }
    if (keyword) {
      list = list.filter(
        (r) =>
          r.cageId.includes(keyword) ||
          r.imageName.includes(keyword) ||
          r.sourceNote.includes(keyword) ||
          String(r.originalRowNumber).includes(keyword)
      );
    }
    if (coordFilter !== "all") list = list.filter((r) => r.coordinateSystem === coordFilter);
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [measurementRecords, activeSnapshotId, viewSnapshots, keyword, coordFilter, statusFilter]);

  const supplements = selectedRecord ? getSupplementByRecordId(selectedRecord.id) : [];

  const handleSelect = (r: MeasurementRecord) => {
    setSelectedRecord(r);
    setSelectedRecordId(r.id);
  };

  const handleJumpToTrace = (recordId: string) => {
    navigate(`/trace?recordId=${recordId}`);
  };

  const stats = useMemo(() => {
    const total = records.length;
    const oob = records.filter((r) => r.status === "out-of-bounds").length;
    const supp = records.filter((r) => r.isSupplemented).length;
    return { total, oob, supp };
  }, [records]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="测量记录"
        subtitle={
          activeSnapshot
            ? `当前视角：${activeSnapshot.name} · ${activeSnapshot.rowRange}`
            : "保留原始行号 · 坐标系标记 · 补录可追溯"
        }
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
          <input
            type="text"
            placeholder="搜索网箱、图片、行号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-56 rounded border border-ocean-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-ocean-300 transition-colors focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
          />
        </div>
        <button className="btn-secondary">
          <Upload className="h-4 w-4" />
          导入 Excel
        </button>
        <button
          className="btn-primary"
          onClick={() => navigate("/trace")}
        >
          <ArrowRight className="h-4 w-4" />
          溯源追踪
        </button>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-1 flex-col overflow-hidden p-6 ${selectedRecord ? "" : ""}`}>
          {coordSystems && (
            <div className="mb-4 rounded border border-coral-200 bg-coral-50 px-4 py-2 text-xs text-coral-700">
              ⚠ 检测到坐标系混用（WGS84 / CGCS2000 / 本地坐标），碰撞检测前请核验坐标转换正确性
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-xl font-bold text-ocean-700">{stats.total}</span>
                <span className="text-xs text-gray-500">条记录</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-xl font-bold text-coral-500">{stats.oob}</span>
                <span className="text-xs text-gray-500">越界</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-num text-xl font-bold text-lavender-500">{stats.supp}</span>
                <span className="text-xs text-gray-500">补录</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded border border-ocean-200 bg-white p-0.5">
                {(["all", "WGS84", "CGCS2000", "LOCAL"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCoordFilter(c)}
                    className={`rounded px-2.5 py-1 text-xs font-mono-num transition-colors ${
                      coordFilter === c
                        ? "bg-ocean-500 text-white"
                        : "text-ocean-600 hover:bg-ocean-50"
                    }`}
                  >
                    {c === "all" ? "全部坐标" : c === "LOCAL" ? "本地" : c}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded border border-ocean-200 bg-white px-2.5 py-1.5 text-xs text-ocean-700 focus:border-ocean-500 focus:outline-none"
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="out-of-bounds">越界</option>
                <option value="pending">待确认</option>
              </select>

              <button className="btn-secondary">
                <Filter className="h-3.5 w-3.5" />
                更多筛选
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <RecordTable
              records={records}
              onSelectRecord={handleSelect}
              selectedId={selectedRecordId}
              hasCoordMismatch={() => coordSystems}
            />
          </div>
        </div>

        {selectedRecord && (
          <SupplementSidebar
            record={selectedRecord}
            supplements={supplements}
            onClose={() => {
              setSelectedRecord(null);
              setSelectedRecordId(null);
            }}
            onJumpToTrace={handleJumpToTrace}
          />
        )}
      </div>
    </div>
  );
}
