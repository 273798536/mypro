import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { NoisePointGroup } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { SourceTag, LateBadge } from "@/components/ui/Badges";
import { FileText, ArrowLeftRight, ExternalLink } from "lucide-react";
import clsx from "clsx";

interface Props {
  group: NoisePointGroup;
  compact?: boolean;
}

export function VariantCompareCard({ group, compact }: Props) {
  const navigate = useNavigate();
  const allVariants = useAppStore((s) => s.variants);
  const allEvidences = useAppStore((s) => s.evidences);
  const allFeedbacks = useAppStore((s) => s.feedbacks);

  const variants = useMemo(
    () => allVariants.filter((v) => v.groupId === group.groupId),
    [allVariants, group.groupId]
  );
  const evidences = useMemo(
    () => allEvidences.filter((e) => e.groupId === group.groupId),
    [allEvidences, group.groupId]
  );
  const feedbackMap: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    variants.forEach((v) => (m[v.feedbackId] = (m[v.feedbackId] || 0) + 1));
    return m;
  }, [variants]);

  return (
    <div className={clsx(
      "card-base overflow-hidden animate-fade-up",
      !compact && "p-5"
    )}>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-serif font-semibold text-neutral-900">
              名称变体对比 · {group.canonicalName}
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              点击任一卡片跳转溯源详情，相邻相似名称之间已自动连线
            </p>
          </div>
          <button
            onClick={() => navigate(`/merge/${group.groupId}`)}
            className="link-back"
          >
            <ExternalLink className="w-3 h-3" />
            追材料
          </button>
        </div>
      )}
      <div
        className={clsx(
          "grid gap-3 relative",
          compact ? "grid-cols-2 p-3" : "grid-cols-3"
        )}
      >
        {variants.map((v, i) => {
          const evs = evidences.filter((e) => e.variantId === v.variantId);
          const feedback = allFeedbacks.find(
            (f) => f.feedbackId === v.feedbackId
          );
          return (
            <button
              key={v.variantId}
              onClick={() => navigate(`/merge/${group.groupId}#v-${v.variantId}`)}
              className={clsx(
                "relative text-left p-3 rounded-civic border transition-all group",
                v.isLateAttachment
                  ? "border-late-300 bg-late-50/60 hover:border-late-500 hover:bg-late-50"
                  : "border-neutral-200 bg-white hover:border-civic-400 hover:bg-civic-50/30"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <SourceTag source={v.sourceType} />
                {v.isLateAttachment && <LateBadge />}
              </div>
              <div className={clsx(
                "font-medium mb-1",
                v.isLateAttachment ? "text-late-700" : "text-neutral-900"
              )}>
                "{v.variantText}"
              </div>
              <div className="text-[11px] text-neutral-500 flex items-center gap-1 mb-2">
                <FileText className="w-3 h-3" />
                {feedback?.submitterName || "未知提交人"} · {v.firstSeen.slice(0,10)}
              </div>
              <div className="pt-2 border-t border-dashed border-neutral-200">
                <div className="text-[11px] text-neutral-600 space-y-0.5">
                  {evs.slice(0, 2).map((e) => (
                    <div key={e.evidenceId} className="flex gap-1">
                      <span className="text-evidence-600 font-medium">
                        {Math.round(e.weight * 100)}%
                      </span>
                      <span className="text-neutral-500 truncate">{e.description}</span>
                    </div>
                  ))}
                  {evs.length === 0 && (
                    <div className="text-neutral-400">暂无证据描述</div>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-civic-600 text-white text-xs px-2 py-1 rounded-civic shadow-md flex items-center gap-1">
                  点击查看原始材料
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </button>
          );
        })}
        {variants.length >= 2 && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden hidden md:block">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#93C5FD" />
                </marker>
              </defs>
              <path
                d="M 18 50 Q 33 30 50 50 T 82 50"
                stroke="#93C5FD"
                strokeWidth="0.6"
                strokeDasharray="1.5 1"
                fill="none"
                opacity="0.7"
              />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-civic-100 text-civic-600 rounded-full flex items-center justify-center border border-civic-200 shadow-sm">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
