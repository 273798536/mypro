import { Upload, Settings, Grid3X3, Axis3D, RotateCcw, FileJson } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Toolbar = () => {
  const {
    showGrid,
    showAxes,
    cameraAutoRotate,
    setShowGrid,
    setShowAxes,
    setCameraAutoRotate,
    loadMockData,
    importData,
  } = useAppStore();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          importData(data);
        }
      } catch (error) {
        console.error('Failed to import data:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0a1628] border-b border-[#00d4ff]/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center">
            <Axis3D size={18} className="text-white" />
          </div>
          <div>
            <div className="text-[#00d4ff] font-bold text-sm">姿态可视化</div>
            <div className="text-[10px] text-gray-500">Spacecraft Attitude Visualizer</div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#00d4ff]/20 mx-2" />

        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded cursor-pointer transition-colors text-xs text-gray-300">
          <Upload size={14} />
          导入数据
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
          />
        </label>

        <button
          onClick={loadMockData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a2a4a] hover:bg-[#2a3a5a] rounded transition-colors text-xs text-gray-300"
        >
          <FileJson size={14} />
          加载示例
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0f1d30] rounded-lg p-0.5">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition-colors ${
              showGrid ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="显示/隐藏网格"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-1.5 rounded transition-colors ${
              showAxes ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="显示/隐藏坐标轴"
          >
            <Axis3D size={16} />
          </button>
          <button
            onClick={() => setCameraAutoRotate(!cameraAutoRotate)}
            className={`p-1.5 rounded transition-colors ${
              cameraAutoRotate ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-500 hover:text-gray-300'
            }`}
            title="自动旋转视角"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="h-6 w-px bg-[#00d4ff]/20 mx-1" />

        <button
          className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
};
