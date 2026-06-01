import { useAppStore } from '@/store/useAppStore'
import { PanelRightClose, PanelRightOpen, AlertTriangle, ClipboardList, Route, CircleDot } from 'lucide-react'
import ConflictPanel from '@/components/conflict/ConflictPanel'
import WorkOrderPanel from '@/components/workorder/WorkOrderPanel'
import RoutePanel from '@/components/route/RoutePanel'
import ValvePanel from '@/components/valve/ValvePanel'

const tabs = [
  { key: 'conflict' as const, label: '冲突', icon: AlertTriangle },
  { key: 'workorder' as const, label: '工单', icon: ClipboardList },
  { key: 'route' as const, label: '路线', icon: Route },
  { key: 'valve' as const, label: '阀门', icon: CircleDot },
]

export default function RightPanel() {
  const activePanelTab = useAppStore((s) => s.activePanelTab)
  const setActivePanelTab = useAppStore((s) => s.setActivePanelTab)
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useAppStore((s) => s.setRightPanelOpen)

  if (!rightPanelOpen) {
    return (
      <button
        onClick={() => setRightPanelOpen(true)}
        className="flex w-8 shrink-0 items-center justify-center border-l"
        style={{ background: '#0F1D2F', borderLeft: '1px solid #1E3A5F' }}
      >
        <PanelRightOpen size={16} style={{ color: '#60A5FA' }} />
      </button>
    )
  }

  return (
    <aside
      className="flex w-[360px] shrink-0 flex-col border-l"
      style={{ background: '#0F1D2F', borderLeft: '1px solid #1E3A5F' }}
    >
      <div className="flex items-center border-b" style={{ borderBottom: '1px solid #1E3A5F' }}>
        <div className="flex flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActivePanelTab(tab.key)}
                className="flex flex-1 items-center justify-center gap-1 border-b-2 py-2 text-xs transition-colors"
                style={{
                  borderColor: activePanelTab === tab.key ? '#1E40AF' : 'transparent',
                  color: activePanelTab === tab.key ? '#60A5FA' : '#94A3B8',
                  fontFamily: 'Noto Sans SC, sans-serif',
                }}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex h-8 w-8 items-center justify-center"
          style={{ color: '#94A3B8' }}
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activePanelTab === 'conflict' && <ConflictPanel />}
        {activePanelTab === 'workorder' && <WorkOrderPanel />}
        {activePanelTab === 'route' && <RoutePanel />}
        {activePanelTab === 'valve' && <ValvePanel />}
      </div>
    </aside>
  )
}
