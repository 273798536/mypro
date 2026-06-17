import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import MarketScene from '@/components/Scene3D/MarketScene';
import EventTimeline from '@/components/Timeline/EventTimeline';
import FilterPanel from '@/components/Panels/FilterPanel';
import StatusPanel from '@/components/Panels/StatusPanel';
import ApprovalPanel from '@/components/Panels/ApprovalPanel';
import { useAppStore } from '@/stores/useAppStore';
import { locations as locationData } from '@/data/mockData';
import { FileText, Clock, Layers } from 'lucide-react';

function Scene3DWrapper() {
  return (
    <Canvas
      className="w-full h-full"
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={45} near={0.1} far={100} />
      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={4}
        maxDistance={16}
        enableDamping
        dampingFactor={0.05}
      />
      <MarketScene />
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </Canvas>
  );
}

export default function AppLayout() {
  const rightPanelTab = useAppStore((s) => s.rightPanelTab);
  const setRightPanelTab = useAppStore((s) => s.setRightPanelTab);

  return (
    <div className="h-screen w-screen flex flex-col bg-navy-900 text-gray-200 font-sans overflow-hidden">
      <header className="h-12 flex items-center px-5 border-b border-gray-700/40 bg-navy-900/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center">
            <Layers size={16} className="text-amber-400" />
          </div>
          <h1 className="font-serif text-base text-amber-400 font-bold tracking-wide">菜场卸货投诉回放</h1>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>3D场景 · 点选地点查看详情</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[58%] relative border-r border-gray-700/40">
          <Scene3DWrapper />
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-navy-900/80 backdrop-blur-sm border border-gray-700/30 text-xs text-gray-400">
            🖱️ 点击标记选择地点 · 拖拽旋转 · 滚轮缩放
          </div>
        </div>

        <div className="w-[42%] flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-700/40 shrink-0">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${
                rightPanelTab === 'timeline'
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setRightPanelTab('timeline')}
            >
              <Clock size={14} />
              事件时间线
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${
                rightPanelTab === 'approval'
                  ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/5'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setRightPanelTab('approval')}
            >
              <FileText size={14} />
              审批台账溯源
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {rightPanelTab === 'timeline' ? <EventTimeline /> : <ApprovalPanel />}
          </div>
        </div>
      </div>

      <div className="h-52 flex border-t border-gray-700/40 shrink-0 bg-navy-900/95">
        <div className="w-[280px] border-r border-gray-700/40 p-4 overflow-y-auto">
          <FilterPanel />
        </div>
        <div className="w-[280px] border-r border-gray-700/40 p-4 overflow-y-auto">
          <StatusPanel />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-amber-400" />
            <span className="font-serif text-sm text-amber-400 font-semibold">地点名称归一对照</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {locationData.map((loc) => (
              <div key={loc.id} className="p-2.5 rounded-lg bg-navy-700/30 border border-gray-700/30">
                <div className="text-xs text-amber-400 font-medium mb-1">{loc.canonicalName}</div>
                <div className="text-xs text-gray-500 leading-relaxed">
                  {loc.aliases.filter((a) => a !== loc.canonicalName).map((a, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-700 mx-1">|</span>}
                      <span className="text-gray-400">{a}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            同一地点在审批台账中可能被写成多种名称，此处列出归一映射关系。点选3D场景或筛选面板中任一别名，均会定位到同一地点。
          </p>
        </div>
      </div>
    </div>
  );
}
