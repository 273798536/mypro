interface SourceBadgeProps {
  source: string
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-dossier/30 bg-dossier/5 px-2 py-0.5 font-mono text-[11px] text-dossier">
      <span className="inline-block h-1 w-1 rounded-full bg-dossier/60" />
      {source}
    </span>
  )
}
