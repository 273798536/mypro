import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: {
    direction: "up" | "down";
    value: string;
    positive?: boolean;
  };
  colorClass?: string;
  pulse?: boolean;
  subtitle?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  colorClass = "from-navy-50 to-white text-navy-700",
  pulse,
  subtitle,
}: Props) {
  return (
    <div
      className={cn(
        "card card-hover p-5 relative overflow-hidden animate-fade-in-up",
        `bg-gradient-to-br ${colorClass}`
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-navy-500/80 tracking-wide uppercase">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-3xl font-serif font-semibold",
                pulse && "animate-pulse-soft"
              )}
            >
              {value}
            </span>
            {unit && (
              <span className="text-sm text-navy-500 font-medium">{unit}</span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-navy-500/80">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                trend.positive
                  ? "bg-moss-50 text-moss-700"
                  : "bg-crimson-50 text-crimson-700"
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="w-3 h-3" strokeWidth={2} />
              ) : (
                <TrendingDown className="w-3 h-3" strokeWidth={2} />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center shadow-sm">
            <Icon className="w-5 h-5 text-navy-600" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/30 blur-2xl pointer-events-none" />
    </div>
  );
}
