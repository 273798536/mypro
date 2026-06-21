import { TimelineItem } from "./TimelineItem";
import type { TimelineEntry } from "@/types";

interface TimelineListProps {
  entries: TimelineEntry[];
  showParameterName?: boolean;
  maxHeight?: string;
}

export function TimelineList({
  entries,
  showParameterName = true,
  maxHeight,
}: TimelineListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-ink-400 text-sm">
        暂无操作记录
      </div>
    );
  }

  return (
    <div
      className="space-y-1"
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      {entries.map((entry) => (
        <TimelineItem
          key={entry.id}
          entry={entry}
          showParameterName={showParameterName}
        />
      ))}
    </div>
  );
}
