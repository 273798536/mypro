import { useAppStore } from '@/store/useAppStore'
import { AlertTriangle, ShieldAlert, Shuffle } from 'lucide-react'

const navItems = [
  { key: 'workbench' as const, label: '工作台' },
  { key: 'route' as const, label: '路线规划' },
  { key: 'valve' as const, label: '阀门管理' },
  { key: 'conflict' as const, label: '冲突检测' },
  { key: 'evidence' as const, label: '工单证据' },
]

export default function Header() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const conflicts = useAppStore((s) => s.conflicts)

  const duplicateCount = conflicts.filter((c) => c.type === 'valve_duplicate').length
  const forbiddenCount = conflicts.filter((c) => c.type === 'route_forbidden').length
  const mismatchCount = conflicts.filter((c) => c.type === 'model_mismatch').length

  return (
    <header
      className="flex h-12 items-center border-b px-4"
      style={{ background: '#0A1628', borderBottom: '1px solid #1E3A5F' }}
    >
      <div className="flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <span className="text-lg font-semibold" style={{ color: '#60A5FA' }}>
          核电管廊巡检路由
        </span>
        <span className="text-lg" style={{ color: '#60A5FA' }}>
          3D工作台
        </span>
      </div>

      <nav className="ml-8 flex items-center gap-1">
        {navItems.map((item, idx) => (
          <div key={item.key} className="flex items-center">
            {idx > 0 && <span className="mx-2 text-xs" style={{ color: '#1E3A5F' }}>|</span>}
            <button
              onClick={() => setActiveView(item.key)}
              className="border-2 px-3 py-1 text-xs transition-colors"
              style={{
                fontFamily: 'Noto Sans SC, sans-serif',
                borderColor: activeView === item.key ? '#1E40AF' : 'transparent',
                color: activeView === item.key ? '#60A5FA' : '#94A3B8',
                background: activeView === item.key ? 'rgba(30,64,175,0.15)' : 'transparent',
              }}
            >
              {item.label}
            </button>
          </div>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <span
          className="flex items-center gap-1 border-2 px-2 py-0.5 text-xs font-medium"
          style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}
        >
          <Shuffle size={12} />
          {duplicateCount}
        </span>
        <span
          className="flex items-center gap-1 border-2 px-2 py-0.5 text-xs font-medium"
          style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}
        >
          <ShieldAlert size={12} />
          {forbiddenCount}
        </span>
        <span
          className="flex items-center gap-1 border-2 px-2 py-0.5 text-xs font-medium"
          style={{ background: '#DC2626', color: '#FFFFFF', borderColor: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}
        >
          <AlertTriangle size={12} />
          {mismatchCount}
        </span>
      </div>
    </header>
  )
}
