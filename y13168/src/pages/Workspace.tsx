import MotorScene from '@/components/MotorScene'
import Timeline from '@/components/Timeline'
import FilterPanel from '@/components/FilterPanel'
import AttributionPanel from '@/components/AttributionPanel'

export default function Workspace() {
  return (
    <div className="h-full flex bg-[#0F1724]">
      <div className="flex flex-col" style={{ width: '60%' }}>
        <div className="flex-1">
          <MotorScene />
        </div>
        <div style={{ height: 120 }}>
          <Timeline />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-2" style={{ width: '40%' }}>
        <div style={{ height: '40%' }}>
          <FilterPanel />
        </div>
        <div style={{ height: '60%' }}>
          <AttributionPanel />
        </div>
      </div>
    </div>
  )
}
