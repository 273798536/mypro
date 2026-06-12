import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  total?: number;
  color: "available" | "pending" | "recollect" | "info";
  icon: React.ReactNode;
  description?: string;
}

const colorMap = {
  available: {
    text: "text-quality-available",
    bg: "bg-quality-available/10",
    border: "border-quality-available/20",
    ring: "from-quality-available/20",
  },
  pending: {
    text: "text-quality-pending",
    bg: "bg-quality-pending/10",
    border: "border-quality-pending/20",
    ring: "from-quality-pending/20",
  },
  recollect: {
    text: "text-quality-recollect",
    bg: "bg-quality-recollect/10",
    border: "border-quality-recollect/20",
    ring: "from-quality-recollect/20",
  },
  info: {
    text: "text-ocean-400",
    bg: "bg-ocean-500/10",
    border: "border-ocean-500/20",
    ring: "from-ocean-500/20",
  },
};

export default function StatusCard({
  label,
  value,
  total,
  color,
  icon,
  description,
}: Props) {
  const c = colorMap[color];
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div
      className={cn(
        "glass-card glass-card-hover p-5 relative overflow-hidden",
        "border",
        c.border
      )}
    >
      <div
        className={cn(
          "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br to-transparent",
          c.ring
        )}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ocean-300/70 mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-3xl font-bold font-serif tracking-tight",
                  c.text
                )}
              >
                {value}
              </span>
              {total !== undefined && (
                <span className="text-sm text-ocean-400">
                  / {total} 条（{percent}%）
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-ocean-400/70 mt-2">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-xl",
              c.bg,
              c.text
            )}
          >
            {icon}
          </div>
        </div>

        {total !== undefined && (
          <div className="mt-4 h-1.5 rounded-full bg-ocean-900/60 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                color === "available" && "bg-quality-available",
                color === "pending" && "bg-quality-pending",
                color === "recollect" && "bg-quality-recollect",
                color === "info" && "bg-ocean-500"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
