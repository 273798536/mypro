
import { useEffect, useRef, useState } from 'react';
import { Wind, Eye, Database, AlertCircle, BookOpen } from 'lucide-react';
import { AirfoilScene } from '../components/Airfoil3D';
import { ControlPanel } from '../components/ControlPanel/ControlPanel';
import { SamplingPanel } from '../components/SamplingPanel/SamplingPanel';
import { RecordPanel } from '../components/RecordPanel/RecordPanel';
import { AlertBanner } from '../components/AlertBanner/AlertBanner';
import { ColorBar } from '../components/ColorBar/ColorBar';
import { useExperimentStore } from '../store/useExperimentStore';
import { validateExperiment } from '../utils/validation';
import { captureScreenshot } from '../utils/export';

export default function Home() {
  const {
    airfoil,
    params,
    pressureField,
    alerts,
    initializeWithSamples,
    calculateField,
    addAlert,
    clearAlerts,
  } = useExperimentStore();

  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const [showFlowLines, setShowFlowLines] = useState(true);
  const [showSamplingPoints, setShowSamplingPoints] = useState(true);

  useEffect(() => {
    initializeWithSamples();
  }, []);

  useEffect(() => {
    if (pressureField) {
      const result = validateExperiment(params, pressureField);
      clearAlerts();
      result.alerts.forEach((alert) => addAlert(alert));
    }
  }, [pressureField, params]);

  const handleScreenshot = () => {
    const canvas = sceneContainerRef.current?.querySelector('canvas');
    if (canvas) {
      captureScreenshot(canvas);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <AlertBanner />

      <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Wind size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                风洞翼型压力场
              </h1>
              <p className="text-xs text-slate-400">Web3D 交互式实验演示系统</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <BookOpen size={14} className="text-cyan-400" />
              <span className="text-slate-300">空气动力学实验教学</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        <div
          ref={sceneContainerRef}
          className="flex-1 relative"
        >
          <AirfoilScene
            airfoil={airfoil}
            angleOfAttack={params.angleOfAttack}
            velocity={params.velocity}
            pressureField={pressureField}
            showSamplingPoints={showSamplingPoints}
            showFlowLines={showFlowLines}
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFlowLines(!showFlowLines)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  showFlowLines
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Eye size={14} className="inline mr-1" />
                流线
              </button>
              <button
                onClick={() => setShowSamplingPoints(!showSamplingPoints)}
                className={`px-3 py-1.5 rounded text-xs transition-colors ${
                  showSamplingPoints
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Database size={14} className="inline mr-1" />
                采样点
              </button>
            </div>

            <div className="w-64">
              <ColorBar pressureField={pressureField} />
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm rounded-lg px-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <span className="text-slate-400">翼型: </span>
                <span className="text-cyan-300 font-mono">{airfoil.name}</span>
              </div>
              <div>
                <span className="text-slate-400">迎角: </span>
                <span className="text-yellow-300 font-mono">{params.angleOfAttack.toFixed(1)}°</span>
              </div>
              <div>
                <span className="text-slate-400">速度: </span>
                <span className="text-green-300 font-mono">{params.velocity.toFixed(0)} m/s</span>
              </div>
              <div>
                <span className="text-slate-400">雷诺数: </span>
                <span className="text-purple-300 font-mono">
                  {(params.reynoldsNumber / 1e6).toFixed(2)}e6
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 bg-slate-800/30 border-l border-slate-700 p-4 space-y-4 overflow-y-auto">
          <ControlPanel onScreenshot={handleScreenshot} />
          <SamplingPanel pressureField={pressureField} />
          <RecordPanel />
        </div>
      </div>
    </div>
  );
}
