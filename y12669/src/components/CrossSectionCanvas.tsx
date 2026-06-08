import { useEffect, useRef, useState } from "react";
import type { CrossSectionData, CrossSectionPoint } from "../../shared/types";
import { cn } from "@/lib/utils";

interface CrossSectionCanvasProps {
  crossSectionData: CrossSectionData;
  editable?: boolean;
  onSupplement?: () => void;
}

interface HoveredPoint {
  point: CrossSectionPoint;
  x: number;
  y: number;
}

export default function CrossSectionCanvas({
  crossSectionData,
  editable = false,
  onSupplement,
}: CrossSectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const { points, parameters, isComplete } = crossSectionData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    setCanvasSize({ width, height });

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;
    const gridSize = 28;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (points.length === 0) return;

    const padding = { top: 40, right: 40, bottom: 50, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const xValues = points.map((p) => p.x);
    const zValues = points.map((p) => p.z);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);

    const xRange = xMax - xMin || 1;
    const zRange = zMax - zMin || 1;

    const scaleX = (x: number) =>
      padding.left + ((x - xMin) / xRange) * plotWidth;
    const scaleZ = (z: number) =>
      padding.top + plotHeight - ((z - zMin) / zRange) * plotHeight;

    ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = scaleX(p.x);
      const y = scaleZ(p.z);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(scaleX(xMax), padding.top + plotHeight);
    ctx.lineTo(scaleX(xMin), padding.top + plotHeight);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = scaleX(p.x);
      const y = scaleZ(p.z);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    const lineGradient = ctx.createLinearGradient(
      padding.left,
      0,
      width - padding.right,
      0
    );
    lineGradient.addColorStop(0, "#6366F1");
    lineGradient.addColorStop(1, "#8B5CF6");
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    points.forEach((p) => {
      const x = scaleX(p.x);
      const y = scaleZ(p.z);

      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "#6366F1";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#6366F1";
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(100, 116, 139, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + plotHeight);
    ctx.lineTo(width - padding.right, padding.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "11px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "基准面 0m",
      (padding.left + width - padding.right) / 2,
      padding.top + plotHeight + 20
    );

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 11px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `X: ${xMin.toFixed(1)}m`,
      padding.left,
      padding.top + plotHeight + 38
    );
    ctx.textAlign = "right";
    ctx.fillText(
      `X: ${xMax.toFixed(1)}m`,
      width - padding.right,
      padding.top + plotHeight + 38
    );
  }, [points]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padding = { top: 40, right: 40, bottom: 50, left: 50 };
    const plotWidth = canvasSize.width - padding.left - padding.right;
    const plotHeight = canvasSize.height - padding.top - padding.bottom;

    const xValues = points.map((p) => p.x);
    const zValues = points.map((p) => p.z);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);

    const xRange = xMax - xMin || 1;
    const zRange = zMax - zMin || 1;

    const scaleX = (x: number) =>
      padding.left + ((x - xMin) / xRange) * plotWidth;
    const scaleZ = (z: number) =>
      padding.top + plotHeight - ((z - zMin) / zRange) * plotHeight;

    let nearest: HoveredPoint | null = null;
    let nearestDist = 18;

    points.forEach((p) => {
      const px = scaleX(p.x);
      const py = scaleZ(p.z);
      const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { point: p, x: px, y: py };
      }
    });

    setHoveredPoint(nearest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full rounded-xl bg-white border border-slate-200 shadow-sm"
          )}
          style={{ height: "260px" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {hoveredPoint && (
          <div
            className="absolute z-20 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs shadow-lg border border-slate-700 pointer-events-none"
            style={{
              left: Math.min(
                hoveredPoint.x + 12,
                canvasSize.width - 140
              ),
              top: Math.max(hoveredPoint.y - 60, 8),
            }}
          >
            <div className="font-semibold text-indigo-300 mb-1">
              剖面测点
            </div>
            <div className="space-y-0.5 text-slate-200">
              <div>X: {hoveredPoint.point.x.toFixed(2)} m</div>
              <div>Y: {hoveredPoint.point.y.toFixed(2)} m</div>
              <div>Z: {hoveredPoint.point.z.toFixed(2)} m</div>
            </div>
          </div>
        )}

        {!isComplete && editable && onSupplement && (
          <div className="absolute bottom-4 right-4">
            <button
              onClick={onSupplement}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              补录剖面图
            </button>
          </div>
        )}
      </div>

      <div className="lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">明细解释</h3>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">深度 (depth)</span>
              <span className="text-lg font-bold text-indigo-600">
                {parameters.depth.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              表示剖面最低点与基准面的垂直距离，用于评估作业区域的沉降或凹陷程度。
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">宽度 (width)</span>
              <span className="text-lg font-bold text-indigo-600">
                {parameters.width.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              表示剖面在水平方向上的覆盖范围，即起点到终点的横向距离。
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">高度 (height)</span>
              <span className="text-lg font-bold text-indigo-600">
                {parameters.height.toFixed(1)}m
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              表示剖面最高点与最低点的垂直落差，反映地形起伏程度。
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">数据完整性</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium",
                  isComplete
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-orange-50 text-orange-700 border border-orange-100"
                )}
              >
                {isComplete ? "● 已完成" : "● 待补录"}
              </span>
            </div>
            {!isComplete && (
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                当前剖面图数据不完整，建议补充更多测点以提升分析精度。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
