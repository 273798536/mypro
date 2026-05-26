import { RefObject } from 'react';
import { Camera, RefreshCw, Layers, Grid3X3, Table } from 'lucide-react';
import { useCashFlowStore } from '../../hooks/useCashFlowStore';
import { useExportImage } from '../../hooks/useExportImage';
import { TerrainSceneHandle } from '../terrain/TerrainScene';

interface AppToolbarProps {
  terrainRef: RefObject<TerrainSceneHandle>;
}

export function AppToolbar({ terrainRef }: AppToolbarProps) {
  const { viewMode, setViewMode } = useCashFlowStore();
  const { exportImage } = useExportImage();

  const handleExport = () => {
    const canvas = terrainRef.current?.getCanvas();
    if (canvas) {
      exportImage(canvas);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
      <div className="flex items-center bg-white/5 rounded-full p-0.5">
        <button
          onClick={() => setViewMode('terrain')}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            viewMode === 'terrain' ? 'bg-emerald-500/80 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('heatmap')}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            viewMode === 'heatmap' ? 'bg-emerald-500/80 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            viewMode === 'table' ? 'bg-emerald-500/80 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
        </button>
      </div>

      <div className="w-px h-5 bg-white/20" />

      <button
        onClick={handleExport}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <Camera className="w-4 h-4" />
      </button>

      <button
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}