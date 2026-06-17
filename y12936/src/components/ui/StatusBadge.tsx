import { STATUS_META } from "@/lib/domain";
import type { SampleStatus } from "@/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: SampleStatus;
  size?: "sm" | "md";
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "chip",
        m.chip,
        size === "sm" && "px-1 py-0 text-[9px]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function StatusDot({ status }: { status: SampleStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", m.dot)}
      title={m.label}
    />
  );
}
