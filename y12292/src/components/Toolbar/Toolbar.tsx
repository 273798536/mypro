
import { useState } from 'react';
import { Upload, Camera, FileText, RotateCcw, Database, AlertCircle } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { DataImportModal } from '../DataImport/DataImportModal';
import { ReportModal } from '../Report/ReportModal';

export function Toolbar() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const loadMockData = useDataStore(state => state.loadMockData);
  const problems = useDataStore(state => state.problems);
  const resetPlayback = useSceneStore(state => state.resetPlayback);
  
  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `定位漂移地图-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };
  
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 px-2 py-2 flex items-center gap-1 shadow-2xl">
          <div className="px-4 py-2 border-r border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-sm">室内定位漂移地图</h1>
                <p className="text-gray-500 text-[10px]">Indoor Positioning Drift Map</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 px-2">
            <ToolbarButton
              icon={<Upload className="w-4 h-4" />}
              label="导入数据"
              onClick={() => setShowImportModal(true)}
            />
            <ToolbarButton
              icon={<Camera className="w-4 h-4" />}
              label="截图"
              onClick={handleScreenshot}
            />
            <ToolbarButton
              icon={<FileText className="w-4 h-4" />}
              label="导出报告"
              onClick={() => setShowReportModal(true)}
              badge={problems.length > 0 ? problems.length : undefined}
            />
            <ToolbarButton
              icon={<RotateCcw className="w-4 h-4" />}
              label="重置视图"
              onClick={resetPlayback}
            />
          </div>
          
          <div className="border-l border-slate-700/50 pl-2">
            <button
              onClick={loadMockData}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all group"
            >
              <span className="text-cyan-400 text-xs font-medium">加载示例数据</span>
            </button>
          </div>
        </div>
      </div>
      
      <DataImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </>
  );
}

function ToolbarButton({ icon, label, onClick, badge }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-all group"
    >
      <div className="flex flex-col items-center gap-1">
        <div className="text-gray-400 group-hover:text-cyan-400 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors">
          {label}
        </span>
      </div>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

