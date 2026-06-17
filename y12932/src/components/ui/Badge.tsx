import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "signal" | "safe" | "critical" | "neutral" | "muted" | "info";

const TONES: Record<Tone, string> = {
  signal: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  safe: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  critical: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  info: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  neutral: "border-edge2 text-cream/80 bg-white/5",
  muted: "border-edge text-faint bg-transparent",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const dotColor: Record<Tone, string> = {
    signal: "bg-amber-400",
    safe: "bg-emerald-400",
    critical: "bg-rose-400",
    info: "bg-sky-400",
    neutral: "bg-cream/60",
    muted: "bg-faint",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wider2",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} />}
      {children}
    </span>
  );
}
