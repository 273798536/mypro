import { useState } from "react";
import {
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Edit3,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FilePlus,
  Gavel,
} from "lucide-react";
import type { TimelineEntry, OperationType } from "@/types";
import { formatDateTime } from "@/utils/formatters";
import { getOperationLabel } from "@/utils/formatters";

interface TimelineItemProps {
  entry: TimelineEntry;
  showParameterName?: boolean;
}

const operationIcons: Record<OperationType, typeof PlusCircle> = {
  create: PlusCircle,
  update: Edit3,
  supplement: FilePlus,
  withdraw: RotateCcw,
  rejudge: Gavel,
  approve: CheckCircle2,
  reject: XCircle,
};

const operationColors: Record<OperationType, string> = {
  create: "text-emerald-600 bg-approved-100",
  update: "text-ink-600 bg-ink-100",
  supplement: "text-blue-600 bg-blue-100",
  withdraw: "text-orange-600 bg-review-100",
  rejudge: "text-purple-600 bg-duplicate-100",
  approve: "text-emerald-600 bg-approved-100",
  reject: "text-red-600 bg-red-100",
};

export function TimelineItem({ entry, showParameterName = true }: TimelineItemProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = operationIcons[entry.operationType];

  return (
    <div className="relative pl-8 pb-4 last:pb-0">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-ink-200" />
      <div
        className={`absolute left-0 top-0 p-1.5 rounded-full ${operationColors[entry.operationType]}`}
      >
        <Icon className="w-3 h-3" />
      </div>

      <div
        className="cursor-pointer transition-soft hover:bg-ink-50/50 rounded-lg p-2 -mx-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink-800">
                {getOperationLabel(entry.operationType)}
              </span>
              {showParameterName && (
                <span className="text-sm text-ink-500">· {entry.parameterName}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(entry.timestamp)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.operator}
              </span>
            </div>
            <p className="text-sm text-ink-600 mt-2 line-clamp-2">
              {entry.reason}
            </p>
          </div>
          <div className="text-ink-400 flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-ink-100 space-y-2">
            {(entry.oldValue !== undefined || entry.newValue !== undefined) && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-ink-500">值变更：</span>
                <span className="text-ink-600 font-mono-code">
                  {entry.oldValue ?? "—"}
                </span>
                <span className="text-ink-300">→</span>
                <span className="text-ink-800 font-mono-code font-medium">
                  {entry.newValue ?? "—"}
                </span>
              </div>
            )}
            {(entry.oldStatus || entry.newStatus) && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-ink-500">状态变更：</span>
                <span className="text-ink-600">{entry.oldStatus ?? "—"}</span>
                <span className="text-ink-300">→</span>
                <span className="text-ink-800 font-medium">
                  {entry.newStatus ?? "—"}
                </span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-ink-500">理由：</span>
              <span className="text-ink-700">{entry.reason}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
