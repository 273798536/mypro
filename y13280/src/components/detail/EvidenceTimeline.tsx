import { useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  NameVariant,
  Evidence,
  ResidentFeedback,
} from "@/types";
import { StatusBadge, LateBadge, SourceTag } from "@/components/ui/Badges";
import { useAppStore } from "@/store/useAppStore";
import {
  FileText,
  User,
  Clock,
  Phone,
  MapPin,
  ExternalLink,
  Gauge,
  AlertOctagon,
  Bookmark,
  Square,
  Diamond,
  ArrowLeft,
  MessageSquare,
  FileImage,
  Paperclip,
  CircleDot,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  onScrollToFeedback: (id: string) => void;
  onScrollToVariant: (id: string) => void;
}

type TimelineNodeKind = "feedback" | "system" | "manual" | "late";

interface TimelineItem {
  id: string;
  kind: TimelineNodeKind;
  time: string;
  title: string;
  description: string;
  feedbackId?: string;
  variantId?: string;
  variant?: NameVariant;
  evidence?: Evidence;
  feedback?: ResidentFeedback;
}

export function EvidenceTimeline({ onScrollToFeedback, onScrollToVariant }: Props) {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const groups = useAppStore((s) => s.groups);
  const allVariants = useAppStore((s) => s.variants);
  const allEvidences = useAppStore((s) => s.evidences);
  const allHistory = useAppStore((s) => s.historyRecords);
  const allFeedbacks = useAppStore((s) => s.feedbacks);

  const group = useMemo(
    () => groups.find((g) => g.groupId === groupId),
    [groups, groupId]
  );
  const variants = useMemo(
    () => allVariants.filter((v) => v.groupId === groupId),
    [allVariants, groupId]
  );
  const evidences = useMemo(
    () => allEvidences.filter((e) => e.groupId === groupId),
    [allEvidences, groupId]
  );
  const history = useMemo(
    () => allHistory.filter((h) => h.groupId === groupId),
    [allHistory, groupId]
  );

  const items: TimelineItem[] = useMemo(() => {
    const arr: TimelineItem[] = [];
    variants.forEach((v) => {
      const fb = allFeedbacks.find((f) => f.feedbackId === v.feedbackId);
      const evs = evidences.filter((e) => e.variantId === v.variantId);
      arr.push({
        id: `v-${v.variantId}`,
        kind: v.isLateAttachment ? "late" : "feedback",
        time: fb?.submitTime || v.firstSeen,
        title: `居民反馈："${v.variantText}"`,
        description: fb?.contentText || evs[0]?.description || "",
        feedbackId: v.feedbackId,
        variantId: v.variantId,
        variant: v,
        feedback: fb,
      });
    });
    history.forEach((h) => {
      arr.push({
        id: `h-${h.recordId}`,
        kind: "manual",
        time: h.operateTime,
        title: `${h.operator} 执行「${h.action === "confirm" ? "确认归并" : h.action === "split" ? "拆分点位" : h.action === "doubt" ? "标记存疑" : h.action === "return" ? "退回算法" : "操作"}」`,
        description: h.remark,
      });
    });
    if (group) {
      arr.push({
        id: `sys-${group.groupId}`,
        kind: "system",
        time: group.createdAt,
        title: `系统自动生成候选归并组，初始置信度 ${Math.round(group.confidence * 100)}%`,
        description: `基于名称相似度+地理距离+正文关键词的综合算法计算，标准名称暂定为「${group.canonicalName}」`,
      });
    }
    arr.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    return arr;
  }, [variants, history, group, allFeedbacks, evidences]);

  return (
    <div className="card-base p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
            <Gauge className="w-5 h-5 text-civic-600" />
            证据链时间线
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            按时间顺序展示证据节点，节点可跳转到对应材料卡片高亮定位
          </p>
        </div>
        <button onClick={() => navigate("/merge")} className="link-back">
          <ArrowLeft className="w-3 h-3" />
          返回工作台
        </button>
      </div>

      <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-civic-300 via-neutral-200 before:to-neutral-100">
        {items.map((item, idx) => {
          const NodeIcon =
            item.kind === "feedback"
              ? CircleDot
              : item.kind === "system"
              ? Square
              : item.kind === "manual"
              ? Diamond
              : AlertOctagon;
          return (
            <div
              key={item.id}
              id={item.id}
              className="relative animate-fade-up group"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                className={clsx(
                  "timeline-node w-[22px] h-[22px] -top-0",
                  item.kind === "late" && "animate-pulse"
                )}
              >
                <div
                  className={clsx(
                    "w-full h-full rounded-sm flex items-center justify-center border-2",
                    item.kind === "feedback" &&
                      "bg-evidence-100 border-evidence-500 text-evidence-700",
                    item.kind === "system" &&
                      "bg-civic-100 border-civic-500 text-civic-700 rounded-none",
                    item.kind === "manual" &&
                      "bg-warning-100 border-warning-500 text-warning-700 rounded-md rotate-45 [&_svg]:-rotate-45",
                    item.kind === "late" &&
                      "bg-late-100 border-late-500 text-late-700 rounded-full"
                  )}
                >
                  <NodeIcon className="w-3 h-3" />
                </div>
              </div>
              <div
                className={clsx(
                  "ml-3 rounded-civic border p-3 transition-all",
                  item.kind === "late"
                    ? "border-late-300 bg-late-50/70 hover:border-late-500"
                    : item.kind === "manual"
                    ? "border-warning-200 bg-warning-50/60 hover:border-warning-400"
                    : "border-neutral-200 bg-white hover:border-civic-300 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-neutral-400">
                      {item.time.replace("T", " ").slice(5, 16)}
                    </span>
                    {item.kind === "late" && <LateBadge />}
                    {item.variant && (
                      <SourceTag source={item.variant.sourceType} />
                    )}
                    {item.variant?.isLateAttachment && <LateBadge />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.feedbackId && (
                      <button
                        onClick={() => onScrollToFeedback(item.feedbackId!)}
                        className="link-back"
                        title="定位到对应材料卡"
                      >
                        <FileText className="w-3 h-3" />
                        点回材料
                      </button>
                    )}
                    {item.variantId && (
                      <button
                        onClick={() => onScrollToVariant(item.variantId!)}
                        className="link-back"
                        title="定位到名称变体"
                      >
                        <Bookmark className="w-3 h-3" />
                        变体
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 text-sm font-medium text-neutral-900">
                  {item.title}
                </div>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
                {item.evidence && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-civic bg-civic-50 text-civic-700 border border-civic-200">
                    证据权重 <span className="font-mono font-semibold">{Math.round(item.evidence.weight * 100)}%</span>
                    · {item.evidence.evidenceType === "name_match" ? "名称匹配" : item.evidence.evidenceType === "geo_prox" ? "地理相近" : "正文引用"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
