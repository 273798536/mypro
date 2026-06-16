import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { ResidentFeedback, NameVariant } from "@/types";
import { LateBadge } from "@/components/ui/Badges";
import { useAppStore } from "@/store/useAppStore";
import {
  FileText,
  User,
  Phone,
  Clock,
  MapPin,
  MessageSquare,
  Paperclip,
  FileImage,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  highlightFeedbackId: string | null;
  onClearHighlight: () => void;
}

export function FeedbackCards({ highlightFeedbackId, onClearHighlight }: Props) {
  const { groupId = "" } = useParams();
  const groups = useAppStore((s) => s.groups);
  const allVariants = useAppStore((s) => s.variants);
  const allFeedbacks = useAppStore((s) => s.feedbacks);

  const group = useMemo(
    () => groups.find((g) => g.groupId === groupId),
    [groups, groupId]
  );
  const variants = useMemo(
    () => allVariants.filter((v) => v.groupId === groupId),
    [allVariants, groupId]
  );
  const feedbackIds = useMemo(
    () => new Set(variants.map((v) => v.feedbackId)),
    [variants]
  );
  const feedbacks = useMemo(
    () => allFeedbacks.filter((f) => feedbackIds.has(f.feedbackId)),
    [allFeedbacks, feedbackIds]
  );

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hoveredFeedback, setHoveredFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (highlightFeedbackId && cardRefs.current[highlightFeedbackId]) {
      const el = cardRefs.current[highlightFeedbackId]!;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(onClearHighlight, 2000);
    }
  }, [highlightFeedbackId]);

  const variantByFeedback: Record<string, NameVariant> = useMemo(() => {
    const m: Record<string, NameVariant> = {};
    variants.forEach((v) => (m[v.feedbackId] = v));
    return m;
  }, [variants]);

  const sorted = useMemo(
    () =>
      [...feedbacks].sort(
        (a, b) =>
          new Date(a.submitTime).getTime() - new Date(b.submitTime).getTime()
      ),
    [feedbacks]
  );

  return (
    <div className="card-base p-5 animate-fade-up" style={{ animationDelay: "50ms" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-civic-600" />
            原始居民反馈材料
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {feedbacks.length} 条材料，按提交时间排序，点击变体名跳转证据链
          </p>
        </div>
        {group && (
          <div className="text-xs text-neutral-500">
            点位组 <span className="font-mono text-civic-600 font-semibold">{group.groupId}</span>
            · 标准名 <span className="font-medium text-neutral-800">{group.canonicalName}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {sorted.map((fb, idx) => {
          const v = variantByFeedback[fb.feedbackId];
          const highlighted = highlightFeedbackId === fb.feedbackId;
          return (
            <div
              key={fb.feedbackId}
              id={`fb-${fb.feedbackId}`}
              ref={(el) => (cardRefs.current[fb.feedbackId] = el)}
              onMouseEnter={() => setHoveredFeedback(fb.feedbackId)}
              onMouseLeave={() => setHoveredFeedback(null)}
              className={clsx(
                "rounded-civic border p-4 transition-all animate-fade-up relative",
                fb.isLate
                  ? "border-late-300 bg-late-50/60 shadow-md"
                  : "border-neutral-200 bg-white",
                highlighted &&
                  "ring-2 ring-civic-500 ring-offset-2 shadow-lg scale-[1.01]",
                hoveredFeedback === fb.feedbackId && !fb.isLate && "border-civic-300 bg-civic-50/30"
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {fb.isLate && (
                <div className="absolute -top-2 right-4 flex items-center gap-1 px-2 py-0.5 rounded-civic bg-late-500 text-white text-[10px] font-semibold shadow">
                  <AlertCircle className="w-3 h-3" />
                  晚到附件 · 后补登记
                </div>
              )}

              <div className="flex items-start gap-3 flex-wrap">
                <div className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  fb.isLate ? "bg-late-500 text-white" : "bg-civic-100 text-civic-700 border border-civic-200"
                )}>
                  <User className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-900">{fb.submitterName}</span>
                    <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {fb.submitterPhone}
                    </span>
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-civic border",
                      fb.isLate
                        ? "bg-late-100 border-late-200 text-late-700"
                        : "bg-neutral-100 border-neutral-200 text-neutral-600"
                    )}>
                      {fb.submissionChannel}
                    </span>
                    {fb.isLate && <LateBadge />}
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fb.submitTime.replace("T", " ")}
                    </span>
                    {v && (
                      <button
                        onClick={() => {
                          const el = document.getElementById(`v-${v.variantId}`);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="link-back"
                      >
                        <MapPin className="w-3 h-3" />
                        原始地点: {fb.rawLocationText}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 p-3 rounded-civic bg-neutral-50 border border-neutral-100 text-sm text-neutral-700 leading-relaxed">
                    {v && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-civic bg-civic-100 text-civic-700 text-xs mr-2 mb-1 font-medium border border-civic-200">
                        <BookmarkIcon />
                        变体: {v.variantText}
                      </span>
                    )}
                    <span>{fb.contentText}</span>
                  </div>

                  {fb.attachmentUrls.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        附件 ({fb.attachmentUrls.length})
                      </span>
                      {fb.attachmentUrls.map((a, i) => (
                        <span
                          key={i}
                          className={clsx(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-civic border text-xs",
                            a.match(/\.(jpg|png|gif)$/i)
                              ? "bg-civic-50 border-civic-200 text-civic-700"
                              : a.match(/\.(mp3|m4a|wav)$/i)
                              ? "bg-warning-50 border-warning-200 text-warning-700"
                              : "bg-neutral-50 border-neutral-200 text-neutral-600"
                          )}
                        >
                          {a.match(/\.(jpg|png|gif)$/i) ? (
                            <FileImage className="w-3 h-3" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          {a}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookmarkIcon() {
  return <span className="not-italic">🔖</span>;
}
