import { useEffect, useState } from 'react'
import { Music, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClueCard as ClueCardType, AuthStatus } from '@/data/scenarios'

const authBadgeConfig: Record<AuthStatus, { label: string; icon: typeof ShieldCheck; className: string }> = {
  valid: { label: '授权有效', icon: ShieldCheck, className: 'bg-success/20 text-success-light border-success/40' },
  expired: { label: '授权过期', icon: ShieldAlert, className: 'bg-danger/20 text-danger-light border-danger/40' },
  none: { label: '无授权', icon: ShieldX, className: 'bg-danger/20 text-danger-light border-danger/40' },
}

interface ClueCardProps {
  card: ClueCardType
  index: number
}

export default function ClueCard({ card, index }: ClueCardProps) {
  const [revealed, setRevealed] = useState(false)
  const badge = authBadgeConfig[card.authStatus]
  const BadgeIcon = badge.icon

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), index * 150)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <div
      className={cn(
        'card-base p-4 transition-all duration-500',
        revealed
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 rotate-x-12'
      )}
      style={{ perspective: '600px' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-amber" />
          <h3 className="font-serif text-parchment-100 text-base font-semibold">
            {card.songName}
          </h3>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border',
            badge.className
          )}
        >
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="label-text w-16">作者</span>
          <span className="text-ink-200">{card.author}</span>
        </div>

        {card.sampleSource && (
          <div className="flex items-center gap-2">
            <span className="label-text w-16">采样来源</span>
            <span className="text-ink-200">{card.sampleSource}</span>
            {card.sampleDuration != null && card.originalDuration != null && (
              <span className="text-xs text-ink-400 font-mono">
                ({card.sampleDuration}s / {card.originalDuration}s)
              </span>
            )}
          </div>
        )}

        {card.authExpiryDate && (
          <div className="flex items-center gap-2">
            <span className="label-text w-16">到期日期</span>
            <span className="text-ink-200 font-mono text-xs">{card.authExpiryDate}</span>
          </div>
        )}

        {card.isrc && (
          <div className="flex items-center gap-2">
            <span className="label-text w-16">ISRC</span>
            <span className="text-ink-300 font-mono text-xs">{card.isrc}</span>
          </div>
        )}

        {card.hasConflictingTrack && (
          <div className="mt-2 px-2 py-1.5 bg-danger/10 border border-danger/30 rounded text-xs">
            <span className="text-danger-light font-semibold">同名冲突：</span>
            <span className="text-ink-200">
              {card.conflictingTrackAuthor}（{card.conflictingTrackIsrc}）
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
