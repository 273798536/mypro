import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { HistoryRecord } from "@/types";
import { ACTION_LABEL, STATUS_LABEL } from "@/types";
import { diffSnapshots } from "@/utils/diffSnapshot";
import { useAppStore } from "@/store/useAppStore";
import {
  CheckCircle2,
  Scissors,
  Combine,
  HelpCircle,
  RotateCcw,
  User,
  ArrowRight,
  Clock,
  Calendar,
  Bookmark,
  MapPin,
  Eye,
} from "lucide-react";
import clsx from "clsx";

const ACTION_ICONS = {
  confirm: CheckCircle2,
  split: Scissors,
  merge: Combine,
  doubt: HelpCircle,
  return: RotateCcw,
} as const;

const ACTION_COLORS = {
  confirm: "bg-evidence-100 border-evidence-400 text-evidence-700",
  split: "bg-warning-100 border-warning-400 text-warning-700",
  merge: "bg-civic-100 border-civic-400 text-civic-700",
  doubt: "bg-late-100 border-late-400 text-late-700",
  return: "bg-risk-100 border-risk-400 text-risk-700",
} as const;

interface Props {
  record: HistoryRecord;
  index: number;
  isLeft: boolean;
}

export function HistoryTimelineItem({ record, index, isLeft }: Props) {
  const navigate = useNavigate();
  const Icon = ACTION_ICONS[record.action];
  const isLaoCao = record.operator.includes("老曹");
  const groups = useAppStore((s) => s.groups);
  const group = useMemo(
    () => groups.find((g) => g.groupId === record.groupId),
    [groups, record.groupId]
  );
  const diff = diffSnapshots(record.beforeState, record.afterState);

  return (
    <div
      className={clsx(
        "relative w-full flex animate-fade-up",
        isLeft ? "pr-[calc(50%+24px)] justify-end" : "pl-[calc(50%+24px)]"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={clsx(
          "absolute top-4 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 bg-white",
          isLeft ? "left-[calc(50%-20px)]" : "right-[calc(50%-20px)]",
          isLaoCao ? "border-civic-500 ring-4 ring-civic-100" : "border-neutral-300",
          ACTION_COLORS[record.action]
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div
        className={clsx(
          "card-base p-4 w-full max-w-[480px] overflow-hidden relative",
          isLaoCao && "ring-2 ring-civic-200"
        )}
      >
        {isLaoCao && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-civic-600 via-civic-500 to-civic-400" />
        )}

        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={clsx(
                  "badge border",
                  ACTION_COLORS[record.action]
                )}
              >
                <Icon className="w-3 h-3" />
                {ACTION_LABEL[record.action]}
              </span>
              {isLaoCao && (
                <span className="badge bg-civic-100 text-civic-700 border border-civic-200 font-medium">
                  <User className="w-3 h-3" />
                  老曹判断
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
              <span className="flex items-center gap-0.5">
                <User className="w-3 h-3" />
                {record.operator}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5 font-mono">
                <Clock className="w-3 h-3" />
                {record.operateTime.replace("T", " ").slice(5, 16)}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5 flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />
              {record.sessionId}
            </div>
          </div>
          <button
            onClick={() => navigate(`/merge/${record.groupId}`)}
            className="link-back shrink-0"
          >
            <Eye className="w-3 h-3" />
            点位
          </button>
        </div>

        {group && (
          <div className="mt-3 px-3 py-2 rounded-civic bg-neutral-50 border border-neutral-100 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-civic-600 shrink-0" />
            <span className="text-xs text-neutral-500 mr-1">对象:</span>
            <span className="font-mono text-xs text-neutral-400">
              {group.groupId}
            </span>
            <span className="text-sm font-medium text-neutral-800 truncate">
              {group.canonicalName}
            </span>
          </div>
        )}

        {(diff.statusChanged || diff.nameChanged || diff.added.length > 0 || diff.removed.length > 0) && (
          <div className="mt-3 p-3 rounded-civic bg-white border border-neutral-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                变更对比
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-civic bg-neutral-50 border border-neutral-200">
                <div className="text-[10px] font-semibold text-neutral-400 uppercase mb-1">
                  变更前
                </div>
                <DiffContent
                  status={diff.statusChanged?.from}
                  name={diff.nameChanged?.from}
                  removedList={diff.removed}
                />
              </div>
              <div className="p-2 rounded-civic bg-civic-50/60 border border-civic-200">
                <div className="text-[10px] font-semibold text-civic-600 uppercase mb-1 flex items-center gap-1">
                  变更后 <ArrowRight className="w-3 h-3" />
                </div>
                <DiffContent
                  status={diff.statusChanged?.to}
                  name={diff.nameChanged?.to}
                  addedList={diff.added}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-dashed border-neutral-200">
          <div className="text-[11px] text-neutral-400 mb-1 flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            操作备注（必填）
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">{record.remark}</p>
        </div>
      </div>
    </div>
  );
}

function DiffContent({
  status,
  name,
  removedList,
  addedList,
}: {
  status?: string;
  name?: string;
  removedList?: string[];
  addedList?: string[];
}) {
  const statusLabel = status ? STATUS_LABEL[status as keyof typeof STATUS_LABEL] : null;
  return (
    <div className="space-y-1">
      {statusLabel && (
        <div>
          <span className="text-neutral-400">状态: </span>
          <span className="font-medium text-neutral-700">{statusLabel}</span>
        </div>
      )}
      {name && (
        <div>
          <span className="text-neutral-400">名称: </span>
          <span className="font-medium text-neutral-800">{name}</span>
        </div>
      )}
      {removedList && removedList.length > 0 && (
        <div>
          <span className="text-late-500 text-[10px] block mb-0.5">移除变体:</span>
          {removedList.map((t) => (
            <span
              key={t}
              className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 text-[10px] rounded-civic bg-late-50 text-late-700 border border-late-200 line-through"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {addedList && addedList.length > 0 && (
        <div>
          <span className="text-evidence-600 text-[10px] block mb-0.5">新增变体:</span>
          {addedList.map((t) => (
            <span
              key={t}
              className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 text-[10px] rounded-civic bg-evidence-50 text-evidence-700 border border-evidence-200 underline decoration-dotted"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
