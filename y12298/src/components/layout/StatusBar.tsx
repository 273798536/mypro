import { useAppStore } from '@/store/useAppStore'
import { useEffect, useState } from 'react'

function formatTime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

export default function StatusBar() {
  const corridor = useAppStore((s) => s.corridor)
  const conflicts = useAppStore((s) => s.conflicts)
  const [now, setNow] = useState(formatTime(new Date()))

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(formatTime(new Date()))
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  return (
    <footer
      className="flex h-7 items-center border-t px-3"
      style={{ background: '#070E1A', borderTop: '1px solid #1E3A5F', fontFamily: 'JetBrains Mono, monospace' }}
    >
      <div className="text-xs" style={{ color: '#94A3B8' }}>
        {corridor.name} <span style={{ color: '#475569' }}>v{corridor.version}</span>
      </div>
      <div className="flex-1 text-center text-xs" style={{ color: '#94A3B8' }}>
        {now}
      </div>
      <div className="text-xs font-medium" style={{ color: '#DC2626' }}>
        冲突: {conflicts.length}
      </div>
    </footer>
  )
}
