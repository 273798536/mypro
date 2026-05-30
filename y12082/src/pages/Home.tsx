import { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import Scene3D from '../components/three/Scene3D';
import ControlPanel from '../components/ControlPanel';
import InfoPanel from '../components/InfoPanel';
import AnomalyPanel from '../components/AnomalyPanel';
import Timeline from '../components/Timeline';

export default function Home() {
  const [showAnomalyPanel, setShowAnomalyPanel] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">校园地下空间导览系统</h1>
            <p className="text-xs text-slate-400">Campus Underground Navigation System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Layers className="w-4 h-4" />
            <span>3D地下空间模型 · B1层</span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnomalyPanel(!showAnomalyPanel)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                showAnomalyPanel
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {showAnomalyPanel ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              异常复核
            </button>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                showTimeline
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {showTimeline ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              时间轴
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <Scene3D height="100%" />
            
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur rounded-lg p-3 text-white text-sm space-y-2">
              <p className="font-semibold text-xs text-slate-400 mb-2">图例</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-xs">入口</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-indigo-500" />
                <span className="text-xs">设备房</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500" />
                <span className="text-xs">管井</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-xs">畅通通道</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" />
                <span className="text-xs">门禁异常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-xs">封闭通道</span>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur rounded-lg p-3 text-white text-xs space-y-1">
              <p className="font-semibold text-slate-400 mb-1">操作提示</p>
              <p>🖱️ 左键拖动 - 旋转视角</p>
              <p>🖱️ 右键拖动 - 平移视图</p>
              <p>🖱️ 滚轮 - 缩放</p>
              <p>🖱️ 单击节点 - 查看详情</p>
              <p>🖱️ 双击节点 - 设置起点/终点</p>
            </div>
          </div>
          
          {showAnomalyPanel && <AnomalyPanel />}
          {showTimeline && <Timeline />}
        </div>
        
        <InfoPanel />
      </div>
    </div>
  );
}
