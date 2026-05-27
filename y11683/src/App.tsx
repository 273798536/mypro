import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import TunnelScene from './components/Canvas3D/TunnelScene';
import DetailPanel from './components/DetailPanel/DetailPanel';
import Toolbar from './components/Toolbar/Toolbar';
import Timeline from './components/Timeline/Timeline';
import AlertPanel from './components/AlertPanel/AlertPanel';
import FileUpload from './components/DataUpload/FileUpload';
import { useStore } from './store/useStore';
import { exportCanvasAsPNG, exportDataAsCSV } from './utils/export';

export default function App() {
  const [showUpload, setShowUpload] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { data, corrections, loadMockData, hoveredDataId, selectedDataId } = useStore();

  useEffect(() => {
    loadMockData();
  }, []);

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      exportCanvasAsPNG(canvas, 'futures-term-structure.png');
    }
  };

  const handleExportCSV = () => {
    exportDataAsCSV(data, corrections, 'futures-data.csv');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A1628] text-white overflow-hidden">
      <Toolbar
        onFileSelect={() => setShowUpload(true)}
        onExportPNG={handleExportPNG}
        onExportCSV={handleExportCSV}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <Canvas
            camera={{ position: [80, 60, 100], fov: 45, near: 0.1, far: 500 }}
            onCreated={({ gl, scene }) => {
              gl.setClearColor(new THREE.Color('#0A1628'));
              scene.fog = new THREE.Fog('#0A1628', 100, 250);
            }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
          >
            <fog attach="fog" args={['#0A1628', 100, 250]} />
            <TunnelScene />
          </Canvas>

          {hoveredDataId && (
            <HoverTooltip />
          )}

          <AlertPanel />
        </div>

        <div className="w-[400px] flex-shrink-0">
          <DetailPanel />
        </div>
      </div>

      <Timeline />

      {showUpload && <FileUpload onClose={() => setShowUpload(false)} />}
    </div>
  );
}

function HoverTooltip() {
  const { data, hoveredDataId } = useStore();
  const item = data.find((d) => d.id === hoveredDataId);

  if (!item) return null;

  return (
    <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg px-4 py-3 pointer-events-none z-10">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg font-mono text-blue-400">{item.contractMonth}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
          {item.timeWindow}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <span className="text-slate-400">价格</span>
        <span className="text-slate-200 font-mono text-right">{item.price.toFixed(2)}</span>
        <span className="text-slate-400">成交量</span>
        <span className="text-slate-200 font-mono text-right">{item.volume.toLocaleString()}</span>
        <span className="text-slate-400">基差</span>
        <span className="text-slate-200 font-mono text-right">{item.basis.toFixed(2)}</span>
        <span className="text-slate-400">原始行</span>
        <span className="text-slate-200 font-mono text-right">{item.originalRow}</span>
      </div>
    </div>
  );
}