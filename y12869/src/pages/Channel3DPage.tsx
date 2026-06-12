import { Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ChannelScene } from '@/components/channel3d/ChannelScene';
import { ClippingPlaneControl } from '@/components/channel3d/ClippingPlaneControl';
import { use3DSceneSync } from '@/hooks/use3DSceneSync';
import { useAppStore } from '@/store/useAppStore';
import { useAnomalyDisposal } from '@/hooks/useAnomalyDisposal';
import { Info, Layers, BarChart3, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function Channel3DPage() {
  const { loading, report, filteredPoints, anomalyPoints } = use3DSceneSync();
  const { stats } = useAnomalyDisposal();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-ocean-700 border-t-ocean-400 animate-spin" />
          <div className="text-sm text-channel-muted">正在加载航道模型与测点…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-4 pointer-events-none">
        <div className="card p-3 backdrop-blur bg-channel-panel/80 pointer-events-auto max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-ocean-400" />
            <span className="text-sm font-semibold">{report?.channelName}</span>
          </div>
          <div className="text-xs text-channel-muted">
            {report?.sections.length} 断面 · {report?.summary.totalPointCount} 测点 · {report?.datumPlane}
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <div className="card px-3 py-2 backdrop-blur bg-channel-panel/80 flex items-center gap-2 text-xs">
            <span className="chip-gray">总测点</span>
            <span className="font-mono font-semibold text-channel-text">{filteredPoints.length.toLocaleString()}</span>
          </div>
          <div className="card px-3 py-2 backdrop-blur bg-channel-panel/80 flex items-center gap-2 text-xs">
            <span className="chip-orange">异常点</span>
            <span className="font-mono font-semibold text-amber-300">{anomalyPoints.length}</span>
          </div>
          <div className="card px-3 py-2 backdrop-blur bg-channel-panel/80 flex items-center gap-2 text-xs">
            <span className="chip-blue">淤积</span>
            <span className="font-mono font-semibold">{report?.summary.siltationTotal.toLocaleString()} m³</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <ChannelScene />
        <ClippingPlaneControl />
      </div>

      <div className="absolute left-3 bottom-4 z-10 flex flex-col gap-2">
        <div className="card p-2 backdrop-blur bg-channel-panel/80 flex flex-col gap-1">
          <button className="p-2 rounded hover:bg-ocean-700/40 text-channel-muted hover:text-channel-text transition-colors" title="放大"><ZoomIn className="w-4 h-4" /></button>
          <button className="p-2 rounded hover:bg-ocean-700/40 text-channel-muted hover:text-channel-text transition-colors" title="缩小"><ZoomOut className="w-4 h-4" /></button>
          <button className="p-2 rounded hover:bg-ocean-700/40 text-channel-muted hover:text-channel-text transition-colors" title="全屏"><Maximize2 className="w-4 h-4" /></button>
        </div>
        <div className="card p-2 backdrop-blur bg-channel-panel/80 max-w-[220px]">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-ocean-400" />
            <span className="label-muted">异常汇总</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span>严重</span><span className="font-mono ml-auto">{stats.bySeverity.red}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span>较重</span><span className="font-mono ml-auto">{stats.bySeverity.orange}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /><span>一般</span><span className="font-mono ml-auto">{stats.bySeverity.yellow}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span>提示</span><span className="font-mono ml-auto">{stats.bySeverity.blue}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AppShell };
