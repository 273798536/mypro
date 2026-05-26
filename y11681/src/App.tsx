import { Scene3D } from '@/components/Scene3D';
import { ParameterInput } from '@/components/ControlPanel/ParameterInput';
import { PlaybackControl } from '@/components/PlaybackControl/Playbar';
import { LandingHeatmap } from '@/components/Heatmap/LandingHeatmap';
import { TrainingRecords } from '@/components/RecordList/TrainingRecords';
import { TrajectoryCompare } from '@/components/ComparePanel/TrajectoryCompare';
import { ReportExporter } from '@/components/ExportPanel/ReportExporter';
import { ResultDisplay } from '@/components/ResultDisplay';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { Flag, Activity } from 'lucide-react';

function App() {
  const { calculate } = useTrajectoryStore();

  return (
    <div className="w-full h-full flex flex-col bg-golf-dark">
      <header className="h-14 flex items-center px-6 border-b border-golf-teal/20 bg-golf-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-golf-teal">
            <Flag size={18} className="text-golf-dark" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-golf-green">
              高尔夫弹道分析器
            </h1>
            <p className="text-xs text-gray-500">
              Golf Trajectory Analyzer
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Activity size={12} className="text-golf-green animate-pulse" />
            <span>实时物理模拟</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-golf-teal/20 overflow-y-auto p-4 space-y-4">
          <ParameterInput />
          <ResultDisplay />
          <PlaybackControl />
        </aside>

        <main className="flex-1 relative">
          <Scene3D />
        </main>

        <aside className="w-80 flex-shrink-0 border-l border-golf-teal/20 overflow-y-auto p-4 space-y-4">
          <LandingHeatmap />
          <TrajectoryCompare />
          <TrainingRecords />
          <ReportExporter />
        </aside>
      </div>
    </div>
  );
}

export default App;
