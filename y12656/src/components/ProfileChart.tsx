import { useRef, useEffect, useState, useCallback } from "react";
import { Camera, ZoomIn, ZoomOut, Move, Save, Layers } from "lucide-react";
import type { ViewSnapshot } from "@/types";

interface ProfileChartProps {
  data: number[];
  deviationThreshold?: number;
  savedSnapshots: ViewSnapshot[];
  currentSnapshotId?: string;
  compareSnapshotId?: string;
  onSaveSnapshot: (params: ViewSnapshot["cameraParams"], name: string) => void;
  onSelectSnapshot: (id: string) => void;
  onToggleCompare?: (id: string | undefined) => void;
  height?: number;
}

export default function ProfileChart({
  data,
  deviationThreshold = 15,
  savedSnapshots,
  currentSnapshotId,
  compareSnapshotId,
  onSaveSnapshot,
  onSelectSnapshot,
  onToggleCompare,
  height = 320,
}: ProfileChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [showCompareSelect, setShowCompareSelect] = useState(false);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const currentSnapshot = savedSnapshots.find((s) => s.id === currentSnapshotId);
  const compareSnapshot = compareSnapshotId
    ? savedSnapshots.find((s) => s.id === compareSnapshotId)
    : undefined;

  useEffect(() => {
    if (currentSnapshot) {
      setPan({ x: currentSnapshot.cameraParams.panX, y: currentSnapshot.cameraParams.panY });
      setZoom(currentSnapshot.cameraParams.zoom);
    }
  }, [currentSnapshotId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0B1929";
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 36, left: 56 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.strokeStyle = "rgba(42, 74, 111, 0.4)";
    ctx.lineWidth = 1;
    const gridX = 10;
    const gridY = 8;
    for (let i = 0; i <= gridX; i++) {
      const x = padding.left + (chartW * i) / gridX;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartH);
      ctx.stroke();
    }
    for (let i = 0; i <= gridY; i++) {
      const y = padding.top + (chartH * i) / gridY;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
    }

    const visibleCount = Math.max(10, Math.floor(data.length / zoom));
    const startIdx = Math.max(0, Math.min(data.length - visibleCount, Math.floor(-pan.x / (chartW / data.length))));
    const endIdx = Math.min(data.length, startIdx + visibleCount);
    const visibleData = data.slice(startIdx, endIdx);

    if (visibleData.length === 0) return;

    const minVal = Math.min(...visibleData) - 20;
    const maxVal = Math.max(...visibleData) + 20;
    const range = Math.max(1, maxVal - minVal);

    ctx.fillStyle = "#8D99AE";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= gridY; i++) {
      const y = padding.top + (chartH * i) / gridY;
      const val = maxVal - (range * i) / gridY;
      ctx.fillText(`${Math.round(val)}m`, padding.left - 6, y + 3);
    }
    ctx.textAlign = "center";
    for (let i = 0; i <= gridX; i++) {
      const x = padding.left + (chartW * i) / gridX;
      const idx = startIdx + Math.floor(((endIdx - startIdx) * i) / gridX);
      ctx.fillText(`${idx}`, x, padding.top + chartH + 18);
    }

    const getX = (i: number) =>
      padding.left + ((i - startIdx) / Math.max(1, endIdx - startIdx - 1)) * chartW;
    const getY = (v: number) => padding.top + ((maxVal - v) / range) * chartH;

    if (compareSnapshot) {
      const shiftedData = visibleData.map((v, i) => {
        const offset = Math.sin(i * 0.08 + compareSnapshot.cameraParams.zoom) * 6;
        return v + offset;
      });
      ctx.strokeStyle = "#3D8BFF";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      shiftedData.forEach((v, i) => {
        const x = getX(startIdx + i);
        const y = getY(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, "rgba(255, 107, 53, 0.3)");
    gradient.addColorStop(0.5, "rgba(255, 209, 102, 0.2)");
    gradient.addColorStop(1, "rgba(46, 196, 182, 0.2)");

    ctx.beginPath();
    ctx.moveTo(getX(startIdx), padding.top + chartH);
    visibleData.forEach((v, i) => {
      ctx.lineTo(getX(startIdx + i), getY(v));
    });
    ctx.lineTo(getX(endIdx - 1), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "#FF6B35";
    ctx.lineWidth = 2;
    ctx.beginPath();
    visibleData.forEach((v, i) => {
      const x = getX(startIdx + i);
      const y = getY(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const baseLine = padding.top + chartH / 2;
    const thresholdY = baseLine - (deviationThreshold / range) * chartH * 2;
    if (thresholdY > padding.top && thresholdY < padding.top + chartH) {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padding.left, thresholdY);
      ctx.lineTo(padding.left + chartW, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 209, 102, 0.8)";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`阈值 ±${deviationThreshold}m`, padding.left + 4, thresholdY - 3);
    }

    ctx.fillStyle = "#FF6B35";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("● 当前视角", padding.left + 4, padding.top + 12);
    if (compareSnapshot) {
      ctx.fillStyle = "#3D8BFF";
      ctx.fillText("▬ 对比视角", padding.left + 90, padding.top + 12);
    }
  }, [data, width, height, pan, zoom, compareSnapshot, deviationThreshold]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(1, Math.min(8, z * delta)));
  };

  const handleSave = () => {
    if (!snapshotName.trim()) return;
    onSaveSnapshot(
      {
        panX: pan.x,
        panY: pan.y,
        zoom,
        visibleRange: [0, data.length - 1],
      },
      snapshotName
    );
    setSnapshotName("");
    setShowSaveModal(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          className="btn btn-default !py-1 !px-2"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          title="缩小"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          className="btn btn-default !py-1 !px-2"
          onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
          title="放大"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          className={`btn !py-1 !px-2 ${dragging ? "btn-primary" : "btn-default"}`}
          title="拖拽平移"
        >
          <Move className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-industrial-border mx-1" />
        <button
          className="btn btn-default !py-1 !px-2"
          onClick={() => setShowCompareSelect((v) => !v)}
          title="视角对比"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          className="btn btn-primary !py-1 !px-2"
          onClick={() => setShowSaveModal(true)}
          title="保存当前视角"
        >
          <Camera className="w-3.5 h-3.5" />
          <span className="ml-1">保存视角</span>
        </button>
      </div>

      {showCompareSelect && (
        <div className="absolute top-10 right-2 z-20 panel p-2 w-56 max-h-64 overflow-auto">
          <div className="text-xs text-industrial-muted mb-2 px-1">选择对比视角</div>
          <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-industrial-border/30 rounded cursor-pointer">
            <input
              type="radio"
              checked={!compareSnapshotId}
              onChange={() => onToggleCompare?.(undefined)}
            />
            <span className="text-xs">不对比</span>
          </label>
          {savedSnapshots.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-industrial-border/30 rounded cursor-pointer"
            >
              <input
                type="radio"
                checked={compareSnapshotId === s.id}
                onChange={() => onToggleCompare?.(s.id)}
              />
              <div className="flex flex-col text-xs">
                <span className="font-mono">{s.name}</span>
                <span className="text-industrial-muted">{s.createdAt}</span>
              </div>
            </label>
          ))}
        </div>
      )}

      {showSaveModal && (
        <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center rounded">
          <div className="panel p-4 w-72">
            <div className="text-sm font-medium mb-3">保存当前视角</div>
            <input
              className="input-field w-full mb-3"
              placeholder="输入视角名称..."
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button className="btn btn-default" onClick={() => setShowSaveModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="rounded border border-industrial-border cursor-grab active:cursor-grabbing"
        style={{ width, height }}
      />

      {savedSnapshots.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-industrial-muted mr-1 self-center">已保存视角：</span>
          {savedSnapshots.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSnapshot(s.id)}
              className={`tag font-mono text-xs transition-colors ${
                currentSnapshotId === s.id
                  ? "bg-status-safe/20 border-status-safe/40 text-status-safe"
                  : "bg-industrial-panel border-industrial-border text-industrial-muted hover:text-industrial-text hover:border-industrial-muted"
              }`}
            >
              <Save className="w-3 h-3 mr-1" />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
