import React from 'react';
import { motion } from 'framer-motion';
import { Scene3D } from './components/Scene3D';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { StepManager } from './components/StepManager';
import { ExportButton } from './components/ExportButton';

const App: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col bg-optical-bg overflow-hidden">
      <header className="flex-none px-6 py-3 border-b border-slate-700/50 z-10">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M6 12h12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">光学薄透镜成像器</h1>
              <p className="text-xs text-slate-400">初中物理 · 光学实验模拟器</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="px-3 py-1 rounded-full bg-slate-700/50">WebGL 3D</span>
            <span className="px-3 py-1 rounded-full bg-slate-700/50">实时计算</span>
          </div>
        </motion.div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative" id="scene-container">
          <Scene3D />
          <ExportButton />
          
          <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-2 text-xs text-slate-400">
            <p>🖱️ 拖拽旋转视角 · 滚轮缩放 · 右键平移</p>
          </div>
        </div>

        <div className="w-80 flex-none p-4 space-y-4 overflow-y-auto scrollbar-thin">
          <ControlPanel />
          <InfoPanel />
          <StepManager />
        </div>
      </div>
    </div>
  );
};

export default App;
