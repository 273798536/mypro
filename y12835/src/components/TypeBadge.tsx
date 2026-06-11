import { cn } from "@/lib/utils";

type RecordType = "freeze" | "thaw";

const config: Record<RecordType, { label: string; className: string }> = {
  freeze: {
    label: "冻存",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  thaw: {
    label: "复苏",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

interface TypeBadgeProps {
  type: RecordType;
  className?: string;
}

export default function TypeBadge({ type, className }: TypeBadgeProps) {
  const { label, className: badgeClass } = config[type];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        badgeClass,
        className
      )}
    >
      {label}
    </span>
  );
}
