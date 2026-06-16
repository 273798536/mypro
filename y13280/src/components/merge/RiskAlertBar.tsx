import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AlertTriangle, MapPin, Ruler, Eye, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

interface Props {
  onReviewed?: () => void;
}

export function RiskAlertBar({ onReviewed }: Props) {
  const adjacentRisks = useAppStore((s) => s.adjacentRisks);
  const groups = useAppStore((s) => s.groups);
  const markReviewed = useAppStore((s) => s.markRiskReviewed);
  const navigate = useNavigate();

  const risks = useMemo(
    () => adjacentRisks.filter((r) => !r.reviewed),
    [adjacentRisks]
  );

  if (risks.length === 0) return null;

  const findGroup = (id: string) => groups.find((g) => g.groupId === id);

  return (
    <div className="space-y-3">
      {risks.map((r, idx) => {
        const gA = findGroup(r.groupA);
        const gB = findGroup(r.groupB);
        return (
          <div
            key={r.riskId}
            className={clsx(
              "rounded-civic p-4 border animate-pulse-risk",
              "bg-gradient-to-r from-risk-50 via-risk-50/80 to-purple-50/60 border-risk-300"
            )}
            style={{ animationDelay: `${idx * 200}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-civic bg-risk-500 text-white flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-risk-700">
                    相邻路口合错风险提示
                  </span>
                  <span className="badge bg-risk-200 text-risk-700">
                    <Ruler className="w-3 h-3" />
                    距离仅 {r.distanceMeters}米 · 低于50米阈值
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mt-1 leading-relaxed">
                  {r.warningReason}
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-civic bg-white border border-neutral-200 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-risk-500" />
                    <span className="font-mono text-xs text-neutral-500">{r.groupA}</span>
                    <button
                      onClick={() => navigate(`/merge/${r.groupA}`)}
                      className="font-medium text-neutral-900 hover:text-civic-700 underline decoration-dotted"
                    >
                      {gA?.canonicalName}
                    </button>
                    {gA && (
                      <span className="text-xs text-neutral-500">
                        ({gA.latitude.toFixed(4)},{gA.longitude.toFixed(4)})
                      </span>
                    )}
                  </div>
                  <div className="text-risk-500 font-bold text-lg">⇄</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-civic bg-white border border-neutral-200 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-risk-500" />
                    <span className="font-mono text-xs text-neutral-500">{r.groupB}</span>
                    <button
                      onClick={() => navigate(`/merge/${r.groupB}`)}
                      className="font-medium text-neutral-900 hover:text-civic-700 underline decoration-dotted"
                    >
                      {gB?.canonicalName}
                    </button>
                    {gB && (
                      <span className="text-xs text-neutral-500">
                        ({gB.latitude.toFixed(4)},{gB.longitude.toFixed(4)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigate(`/merge/${r.groupA}`);
                  }}
                  className="btn-risk text-xs py-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  并排对比
                </button>
                <button
                  onClick={() => {
                    markReviewed(r.riskId);
                    onReviewed?.();
                  }}
                  className="btn-outline text-xs py-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  我已核实
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
