import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  sub?: string;
  tone: "primary" | "confirm" | "warn" | "alert";
  delay?: number;
  onClick?: () => void;
  children?: ReactNode;
}

const TONES = {
  primary: {
    bar: "bg-ink-700",
    value: "text-ink-800",
    card: "hover:border-ink-300",
  },
  confirm: {
    bar: "bg-confirm",
    value: "text-confirm",
    card: "hover:border-confirm/40",
  },
  warn: {
    bar: "bg-warn",
    value: "text-warn",
    card: "hover:border-warn/40",
  },
  alert: {
    bar: "bg-alert",
    value: "text-alert",
    card: "hover:border-alert/40",
  },
};

export default function StatCard({ label, value, sub, tone, delay = 0, onClick, children }: Props) {
  const t = TONES[tone];
  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group relative bg-white border border-ink-100 rounded-xl p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-up cursor-pointer overflow-hidden",
        t.card
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", t.bar)} />
      <div className="pl-3">
        <div className="text-xs text-ink-500 font-medium tracking-wide">{label}</div>
        <div className={cn("mt-2 font-serif font-bold text-3xl leading-none", t.value)}>
          {value}
        </div>
        {sub && (
          <div className="mt-2 text-xs text-ink-400 flex items-center gap-1">
            {sub}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
