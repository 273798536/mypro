import html2canvas from 'html2canvas';
import { useStageStore } from '../../store/useStageStore';
import {
  Play,
  Pause,
  Camera,
  Tag,
  Cone,
  RotateCcw,
  Eye,
  Zap,
  History,
  Save,
  Cloud,
} from 'lucide-react';

export function Toolbar() {
  const {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    showLabels,
    setShowLabels,
    showLightCones,
    showLightCones: _showLightCones,
    setShowLightCones,
    viewMode,
    setViewMode,
    viewMode: _viewMode,
    smoke,
    updateSmoke,
    runFullDetection,
    saveVersion,
    resetToSample,
    routes,
  } = useStageStore();

  const maxDuration = Math.max(...routes.map((r) => r.duration), 30);

  const handleScreenshot = async () => {
    const stageRef = document.getElementById('stage-container');
    if (!stageRef) return;
    
    try {
      const canvas = await html2canvas(stageRef, {
        backgroundColor: '#0a0a14',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `stage-preview-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (e) {
      console.error('截图失败:', e);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm rounded-lg p-2 text-white">
      <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          type="range"
          min="0"
          max={maxDuration}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="w-24"
        />
        <span className="text-[10px] font-mono text-gray-400">
          {currentTime.toFixed(1)}s
        </span>
      </div>

      <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-1.5 rounded transition-colors ${showLabels ? 'bg-cyan-700' : 'hover:bg-gray-700'}`}
          title="显示标签"
        >
          <Tag size={16} />
        </button>
        <button
          onClick={() => setShowLightCones(!showLightCones)}
          className={`p-1.5 rounded transition-colors ${showLightCones ? 'bg-cyan-700' : 'hover:bg-gray-700'}`}
          title="显示光锥"
        >
          <Cone size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1 border-r border-gray-700 border-gray-700 pr-2">
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as any)}
          className="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-600"
        >
          <option value="perspective">透视</option>
          <option value="front">正面</option>
          <option value="side">侧面</option>
          <option value="top">俯视</option>
        </select>
      </div>

      <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
        <button
          onClick={() => updateSmoke({ enabled: !smoke.enabled })}
          className={`p-1.5 rounded transition-colors ${smoke.enabled ? 'bg-cyan-700' : 'hover:bg-gray-700'}`}
          title="烟雾效果"
        >
          <Cloud size={16} />
        </button>
        {smoke.enabled && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={smoke.density}
            onChange={(e) => updateSmoke({ density: Number(e.target.value) })}
            className="w-16"
            title="烟雾浓度"
          />
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={runFullDetection}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-amber-400"
          title="重新检测"
        >
          <Zap size={16} />
        </button>
        <button
          onClick={() => saveVersion('手动保存')}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-green-400"
          title="保存版本"
        >
          <Save size={16} />
        </button>
        <button
          onClick={handleScreenshot}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-blue-400"
          title="导出截图"
        >
          <Camera size={16} />
        </button>
        <button
          onClick={resetToSample}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors text-red-400"
          title="重置"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
