import { Link } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, FileCheck, Mountain } from 'lucide-react'
import Timeline from '@/components/Timeline'
import FilterBar from '@/components/FilterBar'
import Scene3D from '@/components/Scene3D'
import StatsPanel from '@/components/StatsPanel'
import SideDetail from '@/components/SideDetail'
import MergeAlert from '@/components/MergeAlert'

const NAV_TABS = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/annotations', label: '批注管理', icon: MessageSquare },
  { path: '/handover', label: '交接报告', icon: FileCheck },
]

export default function Workspace() {
  return (
    <div className="h-screen flex flex-col bg-[#1a2332] text-gray-200">
      <nav className="flex items-center gap-6 px-4 py-2 bg-[#0f1923] border-b border-gray-700">
        <div className="flex items-center gap-2 text-white font-bold">
          <Mountain size={20} />
          <span>索道站空间复核</span>
        </div>
        <div className="flex items-center gap-1">
          {NAV_TABS.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white rounded hover:bg-gray-700/50 transition-colors"
            >
              <tab.icon size={15} />
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      <Timeline />

      <FilterBar />

      <div className="flex-1 flex min-h-0">
        <div className="w-[65%] flex flex-col p-2 gap-2">
          <div className="flex-1 rounded-lg overflow-hidden border border-gray-700">
            <Scene3D />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <MergeAlert />
          </div>
        </div>
        <div className="w-[35%] flex flex-col border-l border-gray-700">
          <div className="border-b border-gray-700">
            <StatsPanel />
          </div>
          <div className="flex-1 overflow-y-auto">
            <SideDetail />
          </div>
        </div>
      </div>
    </div>
  )
}
