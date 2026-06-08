import { AlertTriangle, Clock, ArrowRight, FileText, Ruler } from "lucide-react";
import type { CollisionResult } from "@/types";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";

interface Props {
  result: CollisionResult;
  index: number;
}

export default function CollisionReportCard({ result, index }: Props) {
  const navigate = useNavigate();
  const { setSelectedCollisionId, getRecordsByIds } = useAppStore();
  const relatedRecords = getRecordsByIds(result.relatedRecordIds);

  const riskLevel =
    result.distance < 18 ? { label: "高风险", cls: "bg-coral-500" }
    : result.distance < 24 ? { label: "临界", cls: "bg-amber-500" }
    : { label: "低风险", cls: "bg-seaweed-500" };

  const handleViewTrace = () => {
    setSelectedCollisionId(result.id);
    navigate(`/trace?collisionId=${result.id}`);
  };

  return (
    <div
      className="eng-card overflow-hidden opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative aspect-video lg:aspect-auto overflow-hidden bg-ocean-100">
          <img
            src={result.screenshotUrl}
            alt={`${result.cageA} 与 ${result.cageB} 碰撞检测`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/60 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className={`badge ${riskLevel.cls} text-white`}>
              <AlertTriangle className="h-3 w-3" />
              {riskLevel.label}
            </span>
            <span className="badge bg-ocean-800/70 text-white backdrop-blur">
              <Ruler className="h-3 w-3" />
              <span className="font-mono-num">{result.distance} m</span>
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-mono-num font-semibold text-ocean-700 shadow">
                {result.cageA}
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-white/80 via-coral-400/80 to-white/80" />
              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-mono-num font-semibold text-ocean-700 shadow">
                {result.cageB}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h4 className="font-song text-base font-semibold text-ocean-800">
                碰撞检测报告 #{result.id.replace("col-", "")}
              </h4>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="h-3 w-3" />
                <span className="font-mono-num">{result.detectedAt}</span>
              </div>
            </div>
          </div>

          <div className="mb-3 rounded border border-lavender-200 bg-lavender-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-lavender-700 mb-0.5 font-song">
              最终结论
            </p>
            <p className="text-xs text-lavender-800 leading-relaxed">{result.conclusion}</p>
          </div>

          <div className="mb-3 flex-1 rounded bg-ocean-50 px-3 py-2">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-ocean-700">
              <FileText className="h-3 w-3" />
              判定依据
            </div>
            <p className="text-[11px] leading-relaxed text-ocean-700/90">{result.basis}</p>
          </div>

          {relatedRecords.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold text-gray-500 font-song">关联记录（可点击跳转）</p>
              <div className="flex flex-wrap gap-1">
                {relatedRecords.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/records`)}
                    className="rounded bg-white border border-ocean-200 px-2 py-0.5 text-[10px] font-mono-num text-ocean-700 transition-colors hover:bg-ocean-50"
                  >
                    行{r.originalRowNumber} · {r.cageId}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleViewTrace} className="btn-primary justify-center w-full">
            <ArrowRight className="h-4 w-4" />
            查看完整溯源链路
          </button>
        </div>
      </div>
    </div>
  );
}
