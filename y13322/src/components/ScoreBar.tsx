interface ScoreBarProps {
  machine: number
  manual?: number
  max?: number
}

export function ScoreBar({ machine, manual, max = 100 }: ScoreBarProps) {
  const machinePct = (machine / max) * 100
  const manualPct = manual !== undefined ? (manual / max) * 100 : null
  const delta = manual !== undefined ? manual - machine : 0
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 w-full overflow-hidden rounded-sm bg-paper-200">
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-dossier/70"
          style={{ width: `${machinePct}%` }}
        />
        {manualPct !== null && (
          <div
            className="absolute inset-y-0 w-0.5 bg-forensic"
            style={{ left: `${manualPct}%` }}
            title={`人工 ${manual}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-ink-500">
          机器 <span className="font-semibold text-ink-900">{machine}</span>
        </span>
        {manual !== undefined ? (
          <span className={delta >= 0 ? 'text-forensic' : 'text-verified'}>
            人工 <span className="font-semibold">{manual}</span>
            <span className="ml-1 text-[10px]">
              {delta > 0 ? `↑${delta}` : delta < 0 ? `↓${-delta}` : '—'}
            </span>
          </span>
        ) : (
          <span className="text-ink-400">人工 —</span>
        )}
      </div>
    </div>
  )
}
