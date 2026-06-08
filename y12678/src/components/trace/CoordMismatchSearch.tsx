import { useState } from "react";
import { Search, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function CoordMismatchSearch() {
  const navigate = useNavigate();
  const { measurementRecords, collisionResults, getSupplementByRecordId } = useAppStore();
  const [query, setQuery] = useState("");
  const [activeResult, setActiveResult] = useState<any>(null);

  const mismatches = measurementRecords.filter(
    (r) => r.coordinateSystem !== "CGCS2000" || r.id === "r-005" || r.id === "r-014"
  );

  const handleSearch = () => {
    if (!query.trim()) {
      setActiveResult(null);
      return;
    }
    const record = measurementRecords.find(
      (r) =>
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.cageId.toLowerCase().includes(query.toLowerCase()) ||
        String(r.originalRowNumber).includes(query)
    );
    if (record) {
      const sups = getSupplementByRecordId(record.id);
      const relatedCols = collisionResults.filter((c) => c.relatedRecordIds.includes(record.id));
      setActiveResult({ record, sups, relatedCols });
    } else {
      setActiveResult({ notFound: true });
    }
  };

  return (
    <div className="eng-card p-5">
      <h4 className="mb-3 flex items-center gap-1.5 font-song text-sm font-semibold text-coral-700">
        <AlertTriangle className="h-4 w-4" />
        坐标系混用倒查（验收专用）
      </h4>
      <p className="mb-3 text-[11px] text-gray-500">
        输入记录ID / 网箱编号 / 原始行号，自动追溯该记录涉及的所有坐标系混用处理环节
      </p>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
          <input
            type="text"
            placeholder="如 r-005 或 C-D02 或 225"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded border border-coral-200 bg-coral-50/30 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-coral-300 focus:border-coral-500 focus:outline-none focus:ring-2 focus:ring-coral-100"
          />
        </div>
        <button onClick={handleSearch} className="btn-danger">
          倒查
        </button>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-[10px] font-semibold text-gray-400">快速选择已知混用记录：</p>
        <div className="flex flex-wrap gap-1.5">
          {mismatches.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setQuery(r.id);
                const sups = getSupplementByRecordId(r.id);
                const relatedCols = collisionResults.filter((c) => c.relatedRecordIds.includes(r.id));
                setActiveResult({ record: r, sups, relatedCols });
              }}
              className={cn(
                "rounded border px-2 py-1 text-[10px] font-mono-num transition-colors",
                activeResult?.record?.id === r.id
                  ? "border-coral-400 bg-coral-100 text-coral-800"
                  : "border-coral-200 bg-white text-coral-700 hover:bg-coral-50"
              )}
            >
              {r.id} · {r.cageId} · {r.coordinateSystem}
            </button>
          ))}
        </div>
      </div>

      {activeResult && (
        <div className="animate-fade-in-up rounded border border-coral-200 bg-coral-50/40 p-4">
          {activeResult.notFound ? (
            <p className="text-xs text-gray-500">未找到匹配记录</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-song text-sm font-semibold text-ocean-800">
                    {activeResult.record.cageId} · 行号 {activeResult.record.originalRowNumber}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono-num">
                    {activeResult.record.imageName}
                  </p>
                </div>
                <span className="badge bg-coral-100 text-coral-700 ring-1 ring-coral-300">
                  <AlertTriangle className="h-3 w-3" />
                  {activeResult.record.coordinateSystem}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <FileText className="mt-0.5 h-3 w-3 text-lavender-500 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-600">来源备注：</span>
                    <span className="text-gray-700">{activeResult.record.sourceNote}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="mt-0.5 h-3 w-3 text-ocean-500 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-600">关联碰撞：</span>
                    {activeResult.relatedCols.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {activeResult.relatedCols.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => navigate(`/collision`)}
                            className="rounded bg-white border border-ocean-200 px-1.5 py-0.5 font-mono-num text-ocean-700 hover:bg-ocean-50"
                          >
                            {c.cageA}↔{c.cageB}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">暂无</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="mt-0.5 h-3 w-3 text-lavender-500 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-600">补录次数：</span>
                    <span className="text-gray-700 font-mono-num">{activeResult.sups.length} 次</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/trace?recordId=${activeResult.record.id}`)}
                className="w-full justify-center btn-primary"
              >
                <ArrowRight className="h-4 w-4" />
                生成完整溯源链路
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
