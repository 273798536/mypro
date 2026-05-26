import { Scene } from '../three/Scene'
import { Sidebar } from '../layout/Sidebar'
import { ControlBar } from '../layout/ControlBar'
import { Timeline } from '../layout/Timeline'

export function Dashboard() {
  return (
    <div className="w-full h-full relative grid-bg">
      <Scene />
      <ControlBar />
      <Sidebar />
      <div className="absolute bottom-4 left-4 right-96">
        <Timeline />
      </div>
    </div>
  )
}
