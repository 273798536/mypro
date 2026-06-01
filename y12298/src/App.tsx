import Scene3D from '@/components/three/Scene3D'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import RightPanel from '@/components/layout/RightPanel'
import StatusBar from '@/components/layout/StatusBar'

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: '#0A1628' }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex-1 flex flex-col">
          <Scene3D />
        </main>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  )
}
