import { useEffect } from 'react';
import { ControlPanel } from '@/components/ControlPanel/ControlPanel';
import { Scene3D } from '@/components/Scene3D/Scene3D';
import { InfoPanel } from '@/components/InfoPanel/InfoPanel';
import { useConfigStore } from '@/store/useConfigStore';

export default function App() {
  const { magnets, fieldLineVersion, interaction, setInteraction } = useConfigStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setInteraction({ isPaused: false });
      }
      if (e.key === ' ') {
        e.preventDefault();
        setInteraction({ isPaused: !interaction.isPaused });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interaction.isPaused, setInteraction]);

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-slate-950">
      <ControlPanel />
      
      <div className="flex-1 relative">
        <Scene3D />
        
        <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
          <div className="flex items-center gap-4 text-xs">
            <div className="text-slate-400">
              磁体: <span className="text-cyan-400 font-mono">{magnets.length}</span>
            </div>
            <div className="text-slate-400">
              场线版本: <span className="text-cyan-400 font-mono">v{fieldLineVersion}</span>
            </div>
            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
              interaction.isPaused 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {interaction.isPaused ? '⏸️ 暂停' : '▶️ 播放'}
            </div>
            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
              interaction.isDragging 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {interaction.isDragging ? '🖱️ 拖动中' : '🖱️ 空闲'}
            </div>
          </div>
        </div>
      </div>
      
      <InfoPanel />
    </div>
  );
}
