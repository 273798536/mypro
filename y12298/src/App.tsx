import { useAppStore } from '@/store/useAppStore'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import RightPanel from '@/components/layout/RightPanel'
import StatusBar from '@/components/layout/StatusBar'
import WorkbenchView from '@/pages/WorkbenchView'
import RouteView from '@/pages/RouteView'
import ValveView from '@/pages/ValveView'
import ConflictView from '@/pages/ConflictView'
import EvidenceView from '@/pages/EvidenceView'

function MainContent() {
  const activeView = useAppStore((s) => s.activeView)

  switch (activeView) {
    case 'route':
      return <RouteView />
    case 'valve':
      return <ValveView />
    case 'conflict':
      return <ConflictView />
    case 'evidence':
      return <EvidenceView />
    case 'workbench':
    default:
      return <WorkbenchView />
  }
}

export default function App() {
  const activeView = useAppStore((s) => s.activeView)
  const showRightPanel = activeView === 'workbench'
  const showSidebar = activeView === 'workbench'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="relative flex-1 overflow-hidden">
          <MainContent />
        </main>
        {showRightPanel && <RightPanel />}
      </div>
      <StatusBar />
    </div>
  )
}
