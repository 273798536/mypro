import type { ProportionVersion } from '@/store'

export default function ProportionTimeline({ versions }: { versions: ProportionVersion[] }) {
  return (
    <div>
      <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>比例版本时间线</h3>
      <div className="relative pl-6">
        <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ backgroundColor: 'var(--border-color)' }} />
        {versions.map((v) => (
          <div key={v.id} className="relative mb-6 last:mb-0">
            <div
              className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2"
              style={{ borderColor: 'var(--amber-gold)', backgroundColor: 'var(--bg-primary)' }}
            />
            <div className="card ml-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.version}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.date}</span>
              </div>
              <div className="space-y-1">
                {v.proportions.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--ink-blue-lighter)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${p.share}%`, backgroundColor: 'var(--amber-gold)' }}
                        />
                      </div>
                      <span style={{ color: 'var(--amber-gold)' }}>{p.share}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {v.note && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{v.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
