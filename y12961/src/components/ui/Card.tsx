import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cn("panel p-5", hover && "panel-hover", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-ink-850 text-sky">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-zinc-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "sky",
  icon,
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "sky" | "amber" | "rose" | "emerald" | "violet";
  icon?: React.ReactNode;
  delay?: number;
}) {
  const accent: Record<string, string> = {
    sky: "text-sky border-sky/30",
    amber: "text-amber border-amber/30",
    rose: "text-rose border-rose/30",
    emerald: "text-emerald border-emerald/30",
    violet: "text-violet border-violet/30",
  };
  return (
    <div
      className="panel panel-hover animate-rise p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{label}</span>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border bg-ink-850",
            accent[tone],
          )}
        >
          {icon}
        </span>
      </div>
      <div className="num mt-3 text-3xl font-semibold text-zinc-50">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-ink-500/60">{icon}</div>}
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="max-w-sm text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
