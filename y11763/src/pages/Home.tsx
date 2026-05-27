import { useEffect, useRef } from 'react';
import CloudChamberScene from '../components/CloudChamber/CloudChamberScene';
import ControlPanel from '../components/ControlPanel/ControlPanel';
import InfoPanel from '../components/InfoPanel/InfoPanel';
import Toolbar from '../components/Toolbar/Toolbar';
import TraceHistoryPanel from '../components/TraceHistory/TraceHistoryPanel';
import { useParticleStore } from '../store/useParticleStore';
import { generateSampleData } from '../data/sampleParticles';
import { Atom } from 'lucide-react';

export default function Home() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const { particles, decayEvents } = generateSampleData();
      const store = useParticleStore.getState();
      store.addParticles(particles);
      decayEvents.forEach((event) => store.addDecayEvent(event));
      initialized.current = true;
    }
  }, []);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Atom className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="font-orbitron text-xl font-bold text-white">粒子碰撞云室</h1>
          <p className="text-xs text-gray-500 font-jetbrains">Particle Cloud Chamber</p>
        </div>
      </div>

      <div className="w-full h-full">
        <CloudChamberScene />
      </div>

      <ControlPanel />
      <InfoPanel />
      <Toolbar />
      <TraceHistoryPanel />

      <div className="absolute bottom-4 right-4 z-10">
        <div className="text-xs text-gray-500 font-jetbrains space-y-1 text-right">
          <p>🖱️ 拖拽旋转视角</p>
          <p>🔍 滚轮缩放</p>
          <p>👆 点击粒子查看详情</p>
        </div>
      </div>
    </div>
  );
}
