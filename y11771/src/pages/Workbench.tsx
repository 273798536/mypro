import { Suspense } from 'react'
import SceneCanvas from '@/components/scene/SceneCanvas'
import WarningBar from '@/components/ui/WarningBar'
import JointControl from '@/components/panel/JointControl'
import ObstaclePanel from '@/components/panel/ObstaclePanel'
import HistoryPanel from '@/components/panel/HistoryPanel'
import Toolbar from '@/components/panel/Toolbar'
import { useRobotStore } from '@/store/useRobotStore'
import { computeEndEffector } from '@/utils/kinematics'
import { Cpu, Crosshair, Activity } from 'lucide-react'

function StatusInfo() {
  const arm = useRobotStore(s => s.arm)
  const warnings = useRobotStore(s => s.warnings)
  const ee = computeEndEffector(arm)

  return (
    <div className="flex items-center gap-4 text-[10px] font-mono">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Crosshair size={11} />
        <span>末端</span>
        <span className="text-cyan-400">
          ({ee.x.toFixed(3)}, {ee.y.toFixed(3)}, {ee.z.toFixed(3)})
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-500">
        <Cpu size={11} />
        <span>自由度</span>
        <span className="text-cyan-400">{arm.joints.length}</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-500">
        <Activity size={11} />
        <span>警告</span>
        <span className={
          warnings.some(w => w.severity === 'danger')
            ? 'text-red-400'
            : warnings.some(w => w.severity === 'warning')
            ? 'text-amber-400'
            : 'text-green-400'
        }>
          {warnings.length}
        </span>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
        active
          ? 'bg-slate-800/80 text-cyan-400 border-b-2 border-cyan-500'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

export default function Workbench() {
  const activeTab = useRobotStore(s => s.activeTab)
  const setActiveTab = useRobotStore(s => s.setActiveTab)
  const warnings = useRobotStore(s => s.warnings)

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070b14] text-slate-200 overflow-hidden">
      <div className="relative flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <WarningBar />
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-cyan-500/50 text-sm animate-pulse">加载3D场景...</div>
            </div>
          }>
            <SceneCanvas />
          </Suspense>
        </div>

        <div className="w-[320px] flex flex-col border-l border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="p-3 border-b border-slate-700/50">
            <Toolbar />
          </div>

          <div className="flex border-b border-slate-700/50">
            <TabButton active={activeTab === 'joints'} onClick={() => setActiveTab('joints')}>
              关节参数
            </TabButton>
            <TabButton active={activeTab === 'obstacles'} onClick={() => setActiveTab('obstacles')}>
              障碍/安全区
            </TabButton>
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              历史记录
            </TabButton>
          </div>

          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
            {activeTab === 'joints' && <JointControl />}
            {activeTab === 'obstacles' && <ObstaclePanel />}
            {activeTab === 'history' && <HistoryPanel />}
          </div>

          <div className="p-2.5 border-t border-slate-700/50 bg-slate-900/80">
            <StatusInfo />
          </div>
        </div>
      </div>
    </div>
  )
}
