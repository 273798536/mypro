import { cn } from "@/lib/utils";
import type { MaterialKind, RouteStatus, Severity } from "@/data/types";
import { KIND_LABEL } from "@/data/selectors";

type Tone = "emerald" | "amber" | "rose" | "sky" | "violet" | "zinc";

const TONE: Record<Tone, string> = {
  emerald: "border-emerald/40 bg-emerald/10 text-emerald-soft",
  amber: "border-amber/40 bg-amber/10 text-amber-soft",
  rose: "border-rose/40 bg-rose/10 text-rose-soft",
  sky: "border-sky/40 bg-sky/10 text-sky-soft",
  violet: "border-violet/40 bg-violet/10 text-violet-soft",
  zinc: "border-line bg-ink-800/60 text-ink-500",
};

const DOT: Record<Tone, string> = {
  emerald: "bg-emerald",
  amber: "bg-amber",
  rose: "bg-rose",
  sky: "bg-sky",
  violet: "bg-violet",
  zinc: "bg-ink-500",
};

function Pill({
  tone,
  children,
  className,
  dot = true,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-tight",
        TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RouteStatus, Tone> = {
  pass: "emerald",
  warn: "amber",
  fail: "rose",
};

const STATUS_LABEL: Record<RouteStatus, string> = {
  pass: "通过",
  warn: "告警",
  fail: "阻断",
};

export function StatusBadge({ status }: { status: RouteStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

const SEV_TONE: Record<Severity, Tone> = {
  info: "emerald",
  warn: "amber",
  critical: "rose",
};

const SEV_LABEL: Record<Severity, string> = {
  info: "通过",
  warn: "告警",
  critical: "阻断",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Pill tone={SEV_TONE[severity]}>{SEV_LABEL[severity]}</Pill>;
}

const KIND_TONE: Record<MaterialKind, Tone> = {
  backup: "amber",
  dict: "sky",
  slowlog: "violet",
};

export function MaterialChip({
  kind,
  name,
}: {
  kind: MaterialKind;
  name?: string;
}) {
  return (
    <Pill tone={KIND_TONE[kind]} dot={false}>
      {KIND_LABEL[kind]}
      {name && <span className="text-ink-500/80">· {name}</span>}
    </Pill>
  );
}

export function Dot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", DOT[tone])} />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT[tone])} />
    </span>
  );
}

export { TONE, STATUS_LABEL, SEV_LABEL, KIND_TONE };
