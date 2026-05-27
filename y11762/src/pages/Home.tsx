import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene3D from '../components/3d/Scene3D';
import MetricSwitch from '../components/ui/MetricSwitch';
import RegionFilter from '../components/ui/RegionFilter';
import DetailPanel from '../components/ui/DetailPanel';
import ImportDialog from '../components/ui/ImportDialog';
import AnomalyBanner from '../components/ui/AnomalyBanner';
import ExportButton from '../components/ui/ExportButton';
import { useStore } from '../store/useStore';
import { Database, Upload, RotateCcw } from 'lucide-react';

export default function Home() {
  const { regions, loadSampleData, setShowImport, showDetail, anomalies, detectAnomalies } = useStore();

  useEffect(() => {
    if (regions.length === 0) {
      loadSampleData();
    } else {
      detectAnomalies();
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0A1628] overflow-hidden relative flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/40 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Database size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-wide" style={{ fontFamily: '"Orbitron", sans-serif' }}>
                Insurance Risk GeoBar
              </h1>
              <p className="text-[10px] text-slate-500 -mt-0.5">保险风险地理柱图</p>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-700/50" />
          <MetricSwitch />
        </div>

        <div className="flex items-center gap-2">
          <RegionFilter />
          <ExportButton />
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-cyan-500/15 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/25 transition-colors"
          >
            <Upload size={14} />
            导入
          </button>
          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
            title="重置为示例数据"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        <Canvas
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          camera={{ position: [0, 18, 22], fov: 50, near: 0.1, far: 200 }}
          style={{ background: '#0A1628' }}
        >
          <Scene3D />
        </Canvas>

        <div className="absolute top-3 left-4 bg-slate-900/70 backdrop-blur-md rounded-lg px-3 py-1.5 border border-slate-700/30 text-xs text-slate-400 z-10">
          {regions.length} 个地区 · {anomalies.length} 个异常
        </div>

        <div className="absolute top-3 right-4 text-[10px] text-slate-600 z-10 max-w-48 text-right leading-relaxed">
          鼠标拖拽旋转 · 滚轮缩放 · 右键平移 · 点击柱体查看明细
        </div>

        {showDetail && <DetailPanel />}
        <AnomalyBanner />
      </div>

      <ImportDialog />
    </div>
  );
}
