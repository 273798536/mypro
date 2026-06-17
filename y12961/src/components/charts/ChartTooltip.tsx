interface TooltipRow {
  label: string;
  value: number | string;
  color?: string;
}

export default function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string;
  rows?: TooltipRow[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-ink-900/95 px-3 py-2 shadow-card backdrop-blur-md">
      {label && (
        <div className="mb-1 font-mono text-[11px] font-semibold text-zinc-100">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 font-mono text-[10px] text-ink-500"
          >
            {p.color && (
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: p.color }}
              />
            )}
            <span className="text-zinc-300">{p.name}</span>
            <span className="ml-auto text-zinc-100">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
