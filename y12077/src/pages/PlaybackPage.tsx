import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Download,
  Route,
  Clock,
  User,
  Package,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { PathScene } from '../components/PathScene';
import { formatDate } from '../utils/heatColor';
import html2canvas from 'html2canvas';

export function PlaybackPage() {
  const {
    rack,
    locations,
    pathNodes,
    isPlaying,
    playbackSpeed,
    currentPathIndex,
    setIsPlaying,
    setPlaybackSpeed,
    setCurrentPathIndex,
  } = useStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentPathIndex((prev) => {
          if (prev >= pathNodes.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, pathNodes.length, setCurrentPathIndex, setIsPlaying]);

  const currentNode = pathNodes[currentPathIndex];

  const handleExportScreenshot = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f0f1a',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `路径回放-${formatDate(new Date())}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('导出截图失败:', error);
    }
  };

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Route size={20} className="text-blue-400" />
            出入库路径回放
          </h1>
          <div className="text-sm text-gray-400">
            共 <span className="text-white font-bold">{pathNodes.length}</span> 个节点
          </div>
        </div>
        <button
          onClick={handleExportScreenshot}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
        >
          <Download size={16} />
          导出截图
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 relative">
          <PathScene rack={rack} locations={locations} pathNodes={pathNodes} />

          {currentNode && (
            <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 p-4 min-w-64">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {currentPathIndex + 1}
                </div>
                <div>
                  <div className="text-white font-medium">{currentNode.info.action}</div>
                  <div className="text-gray-500 text-xs">
                    节点 {currentPathIndex + 1} / {pathNodes.length}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <Package size={14} className="text-green-400" />
                  <span className="text-white">{currentNode.info.skuName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <User size={14} className="text-blue-400" />
                  <span className="text-white">{currentNode.info.operator}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock size={14} className="text-purple-400" />
                  <span className="text-white">{formatDate(currentNode.timestamp)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-72 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">
            路径节点
          </div>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-700"></div>
            <div className="space-y-2">
              {pathNodes.map((node, index) => (
                <button
                  key={node.id}
                  onClick={() => setCurrentPathIndex(index)}
                  className={`w-full relative flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                    index === currentPathIndex
                      ? 'bg-blue-900/50 border border-blue-500'
                      : index < currentPathIndex
                      ? 'bg-gray-800/50 opacity-60'
                      : 'bg-gray-800/30 hover:bg-gray-800'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
                      index === currentPathIndex
                        ? 'bg-blue-600 text-white'
                        : index < currentPathIndex
                        ? 'bg-green-700 text-green-200'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${
                        index === currentPathIndex ? 'text-white' : 'text-gray-300'
                      }`}
                    >
                      {node.info.action}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {node.info.skuName}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="h-20 bg-gray-900 border-t border-gray-700 flex items-center justify-center gap-6 px-6">
        <button
          onClick={() => setCurrentPathIndex(0)}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          disabled={currentPathIndex === 0}
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={() => setCurrentPathIndex(Math.max(0, currentPathIndex - 1))}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          disabled={currentPathIndex === 0}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-4 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        <button
          onClick={() =>
            setCurrentPathIndex(Math.min(pathNodes.length - 1, currentPathIndex + 1))
          }
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          disabled={currentPathIndex === pathNodes.length - 1}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>

        <button
          onClick={() => setCurrentPathIndex(pathNodes.length - 1)}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          disabled={currentPathIndex === pathNodes.length - 1}
        >
          <SkipForward size={20} />
        </button>

        <div className="flex items-center gap-2 ml-4">
          <FastForward size={16} className="text-gray-500" />
          <div className="flex gap-1">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="ml-8 flex-1 max-w-md">
          <input
            type="range"
            min={0}
            max={pathNodes.length - 1}
            value={currentPathIndex}
            onChange={(e) => setCurrentPathIndex(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>开始</span>
            <span>
              进度 {Math.round(((currentPathIndex + 1) / pathNodes.length) * 100)}%
            </span>
            <span>结束</span>
          </div>
        </div>
      </div>
    </div>
  );
}
