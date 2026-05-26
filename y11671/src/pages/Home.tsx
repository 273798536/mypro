import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Scene3D } from '../components/Scene3D';
import { ParameterPanel } from '../components/ParameterPanel';
import { PhaseChart } from '../components/PhaseChart';
import { ExperimentReport } from '../components/ExperimentReport';
import { PlaybackControls } from '../components/PlaybackControls';
import { StatusBar } from '../components/StatusBar';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import { useSimulationStore } from '../store/simulationStore';

export default function Home() {
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const phaseChartRef = useRef<HTMLDivElement>(null);

  useAnimationLoop();

  const pendulums = useSimulationStore(state => state.pendulums);
  const couplingParams = useSimulationStore(state => state.couplingParams);

  const handleExportImage = useCallback(async () => {
    if (!viewContainerRef.current) return;

    try {
      const canvas = await html2canvas(viewContainerRef.current, {
        backgroundColor: '#0a1628',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `pendulum_view_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
    }
  }, []);

  const handleExportConfig = useCallback(() => {
    const config = {
      exportTime: new Date().toISOString(),
      pendulums: pendulums.map(p => ({
        id: p.id,
        length: p.length,
        mass: p.mass,
        initialAngle: p.initialAngle,
        currentAngle: p.angle,
        currentVelocity: p.angularVelocity,
        phase: p.phase,
      })),
      couplingParams: couplingParams,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `pendulum_config_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [pendulums, couplingParams]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <StatusBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0">
          <ParameterPanel />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div ref={viewContainerRef} className="flex-1 relative">
            <Scene3D />

            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">当前配置</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-slate-500">摆数:</span>
                <span className="text-slate-300">{pendulums.length}</span>
                <span className="text-slate-500">耦合系数:</span>
                <span className="text-cyan-400">{couplingParams.couplingCoeff.toFixed(2)}</span>
                <span className="text-slate-500">时间步长:</span>
                <span className="text-cyan-400">{couplingParams.timeStep.toFixed(4)}s</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">摆状态</div>
              <div className="flex flex-wrap gap-1.5">
                {pendulums.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-1 text-xs"
                    title={`摆 ${p.id + 1}: ${p.angle.toFixed(3)} rad`}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-slate-400">
                      {p.angle.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-16 flex-shrink-0">
            <PlaybackControls
              onExportImage={handleExportImage}
              onExportConfig={handleExportConfig}
            />
          </div>
        </div>

        <div className="w-96 flex-shrink-0 flex flex-col border-l border-slate-700/50">
          <div ref={phaseChartRef} className="flex-1 min-h-0">
            <PhaseChart />
          </div>
          <div className="flex-1 min-h-0 border-t border-slate-700/50">
            <ExperimentReport />
          </div>
        </div>
      </div>
    </div>
  );
}
