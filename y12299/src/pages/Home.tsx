import { useState, useRef } from 'react';
import { Download, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scene3D } from '../components/Scene3D';
import { ControlPanel } from '../components/ControlPanel';
import { RiskAnalysis } from '../components/RiskAnalysis';
import { Legend } from '../components/Legend';
import { DataGapNotice } from '../components/DataGapNotice';
import { ExportModal } from '../components/ExportModal';
import { useAppStore } from '../store/useAppStore';

export function Home() {
  const navigate = useNavigate();
  const { modelName, currentWindParams } = useAppStore();
  const [showExportModal, setShowExportModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">赛道赛车空气流线分析</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              模型: {modelName} | 风速: {currentWindParams.speed}m/s | 偏航: {currentWindParams.yawAngle}° | 俯仰: {currentWindParams.pitchAngle}°
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/export')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              <List className="w-4 h-4" />
              导出记录
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              导出截图
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Scene3D className="w-full h-full" />
          <DataGapNotice />
          <Legend />
        </div>

        <div className="w-80 bg-slate-800/30 border-l border-slate-700 p-4 overflow-y-auto">
          <div className="space-y-6">
            <ControlPanel />
            <RiskAnalysis />
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        canvasRef={canvasRef}
      />
    </div>
  );
}
