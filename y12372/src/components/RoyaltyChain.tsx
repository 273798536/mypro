import type { RoyaltyStep } from '@/store'

export default function RoyaltyChain({ steps }: { steps: RoyaltyStep[] }) {
  return (
    <div>
      <h3 className="mb-4 font-serif-sc text-base font-semibold" style={{ color: 'var(--text-primary)' }}>版税计算链</h3>
      <div className="flex flex-col gap-0">
        {steps.map((step, i) => (
          <div key={step.step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: i === steps.length - 1 ? 'var(--amber-gold)' : 'var(--ink-blue-lighter)',
                  color: i === steps.length - 1 ? 'var(--ink-blue)' : 'var(--text-secondary)',
                }}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1" style={{ backgroundColor: 'var(--border-color)' }} />
              )}
            </div>
            <div className="pb-6">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{step.label}</p>
              <p className="mt-0.5 font-serif-sc text-lg font-semibold" style={{ color: 'var(--amber-gold)' }}>{step.value}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
