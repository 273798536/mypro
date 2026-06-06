import {
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  Grid3X3,
  Shield,
  Pencil,
  RotateCcw,
  Maximize2,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function CanvasToolbar() {
  const { canvas, setCanvasZoom, toggleGrid, toggleBoundaries } = useAppStore();

  const zoomPct = Math.round(canvas.zoom * 100);

  return (
    <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-white border border-ink-100 shadow-soft">
      <div className="flex items-center gap-0.5 px-1">
        <ToolBtn active icon={MousePointer} label="选择" />
        <ToolBtn icon={Move} label="平移" />
        <ToolBtn icon={Pencil} label="标注" />
      </div>

      <Divider />

      <div className="flex items-center gap-0.5 px-1">
        <button
          onClick={() => setCanvasZoom(canvas.zoom - 0.1)}
          className="tool-btn"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <div className="w-14 text-center text-xs font-mono text-ink-600 tabular-nums">
          {zoomPct}%
        </div>
        <button
          onClick={() => setCanvasZoom(canvas.zoom + 0.1)}
          className="tool-btn"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5 px-1">
        <ToolBtn
          icon={Grid3X3}
          label="网格"
          active={canvas.showGrid}
          onClick={toggleGrid}
        />
        <ToolBtn
          icon={Shield}
          label="边界"
          active={canvas.showBoundaries}
          onClick={toggleBoundaries}
        />
      </div>

      <Divider />

      <div className="flex items-center gap-0.5 px-1">
        <ToolBtn icon={RotateCcw} label="重置视图" />
        <ToolBtn icon={Maximize2} label="全屏" />
      </div>

      <style>{`
        .tool-btn {
          width: 34px; height: 34px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px; color: #4d505a;
          transition: all 150ms ease;
        }
        .tool-btn:hover { background: #f0f7ff; color: #0071c6; }
        .tool-btn.active { background: #e0effe; color: #0071c6; }
      `}</style>
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('tool-btn', active && 'active')}
      title={label}
    >
      <Icon className="w-4 h-4" strokeWidth={1.8} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-ink-100 mx-1" />;
}
