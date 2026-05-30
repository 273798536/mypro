import { RackScene } from '../components/RackScene';
import { ControlPanel } from '../components/ControlPanel';
import { InfoPanel } from '../components/InfoPanel';
import { useStore } from '../store/useStore';
import { Camera, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

export function HomePage() {
  const { rack, locations, selectedVersionId, heatmapVersions } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedVersion = heatmapVersions.find((v) => v.id === selectedVersionId);

  const handleExportScreenshot = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#0f0f1a',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `货位热图-${selectedVersion?.name || 'screenshot'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('导出截图失败:', error);
    }
  };

  return (
    <div className="h-full flex bg-gray-950">
      <ControlPanel />

      <div className="flex-1 flex flex-col">
        <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-blue-400" />
              <span className="text-sm font-medium text-white">立体仓储货位热图</span>
            </div>
            {selectedVersion && (
              <div className="text-xs text-gray-400">
                当前版本:{' '}
                <span className="text-blue-400 font-medium">
                  {selectedVersion.name}
                </span>
                {selectedVersion.isLocked && (
                  <span className="ml-2 text-yellow-400">🔒</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              共 <span className="text-white font-bold">{locations.length}</span>{' '}
              个货位
            </div>
            <button
              onClick={handleExportScreenshot}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              <Download size={14} />
              导出截图
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 relative">
          <RackScene rack={rack} locations={locations} />

          <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 mb-2">热度图例</div>
            <div className="flex items-center gap-1">
              <div
                className="w-24 h-4 rounded"
                style={{
                  background:
                    'linear-gradient(to right, hsl(60, 80%, 60%), hsl(30, 80%, 55%), hsl(0, 80%, 50%))',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>低</span>
              <span>高</span>
            </div>
          </div>
        </div>
      </div>

      <InfoPanel />
    </div>
  );
}
