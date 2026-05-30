import { Filter, ShieldAlert, ClipboardList } from 'lucide-react'
import FilterPanel from './FilterPanel'
import CollisionPanel from './CollisionPanel'
import DetailsTable from './DetailsTable'

export default function Sidebar() {
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="panel-section p-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-med-blue" />
          <h3 className="text-xs font-semibold text-med-text font-display">筛选</h3>
        </div>
        <FilterPanel />
      </div>

      <div className="panel-section p-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-3.5 h-3.5 text-med-red" />
          <h3 className="text-xs font-semibold text-med-text font-display">碰撞检测</h3>
        </div>
        <CollisionPanel />
      </div>

      <div className="panel-section p-3 flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-3.5 h-3.5 text-med-green" />
          <h3 className="text-xs font-semibold text-med-text font-display">明细</h3>
        </div>
        <DetailsTable />
      </div>
    </div>
  )
}
