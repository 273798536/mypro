import { diffChars } from "@/lib/diff";
import { cn } from "@/lib/utils";

export function DiffText({
  before,
  after,
  side,
}: {
  before: string;
  after: string;
  side: "before" | "after";
}) {
  const segments = diffChars(before, after);
  return (
    <p className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink-300">
      {segments.map((s, i) => {
        if (side === "before") {
          if (s.kind === "add") return null;
          return (
            <span
              key={i}
              className={cn(
                s.kind === "del" &&
                  "rounded bg-danger-500/20 text-danger-300 line-through decoration-danger-400/50",
              )}
            >
              {s.text}
            </span>
          );
        }
        if (s.kind === "del") return null;
        return (
          <span
            key={i}
            className={cn(
              s.kind === "add" &&
                "rounded bg-signal-500/20 text-signal-200",
            )}
          >
            {s.text}
          </span>
        );
      })}
    </p>
  );
}
