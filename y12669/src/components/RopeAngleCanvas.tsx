import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SAFETY_THRESHOLDS } from "../../shared/constants";

interface RopeAngleCanvasProps {
  angle: number;
  length: number;
  tension: number;
}

export default function RopeAngleCanvas({
  angle,
  length,
  tension,
}: RopeAngleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isAngleSafe =
    angle >= SAFETY_THRESHOLDS.ANGLE_MIN && angle <= SAFETY_THRESHOLDS.ANGLE_MAX;
  const isTensionSafe =
    tension >= SAFETY_THRESHOLDS.TENSION_MIN &&
    tension <= SAFETY_THRESHOLDS.TENSION_MAX;
  const isOverallSafe = isAngleSafe && isTensionSafe;

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

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 30;
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

    const padding = 60;
    const pointA = { x: padding, y: padding + 20 };
    const pointB = {
      x: width - padding,
      y: height - padding - 20,
    };

    const rad = (angle * Math.PI) / 180;
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const straightLength = Math.sqrt(dx * dx + dy * dy);

    const scaleFactor = Math.min(1, (width * 0.7) / straightLength);
    const adjustedPointB = {
      x: pointA.x + dx * scaleFactor,
      y: pointA.y + dy * scaleFactor,
    };

    const sag = 15 + (tension / SAFETY_THRESHOLDS.TENSION_MAX) * 25;
    const midX = (pointA.x + adjustedPointB.x) / 2;
    const midY = (pointA.y + adjustedPointB.y) / 2 + sag;

    const ropeColor = isOverallSafe
      ? { start: "#10B981", end: "#34D399" }
      : { start: "#F97316", end: "#EF4444" };

    const gradient = ctx.createLinearGradient(
      pointA.x,
      pointA.y,
      adjustedPointB.x,
      adjustedPointB.y
    );
    gradient.addColorStop(0, ropeColor.start);
    gradient.addColorStop(1, ropeColor.end);

    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.quadraticCurveTo(midX, midY, adjustedPointB.x, adjustedPointB.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.quadraticCurveTo(midX, midY, adjustedPointB.x, adjustedPointB.y);
    ctx.strokeStyle = isOverallSafe
      ? "rgba(16, 185, 129, 0.25)"
      : "rgba(239, 68, 68, 0.25)";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.stroke();

    const drawAnchor = (
      x: number,
      y: number,
      label: string
    ) => {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(30, 58, 95, 0.95)";
      ctx.fill();
      ctx.strokeStyle = isOverallSafe ? "#34D399" : "#F97316";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = isOverallSafe ? "#34D399" : "#F97316";
      ctx.fill();

      ctx.font = "bold 13px PingFang SC, Microsoft YaHei, sans-serif";
      ctx.fillStyle = "#E2E8F0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, y + 32);
    };

    drawAnchor(pointA.x, pointA.y, "锚点 A");
    drawAnchor(adjustedPointB.x, adjustedPointB.y, "锚点 B");

    ctx.beginPath();
    ctx.moveTo(pointA.x, pointA.y);
    ctx.lineTo(pointA.x + 80, pointA.y);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const angleArcRadius = 35;
    const endAngle = Math.atan2(
      adjustedPointB.y - pointA.y,
      adjustedPointB.x - pointA.x
    );
    ctx.beginPath();
    ctx.arc(pointA.x, pointA.y, angleArcRadius, 0, endAngle);
    ctx.strokeStyle = "#60A5FA";
    ctx.lineWidth = 2;
    ctx.stroke();

    const labelAngle = endAngle / 2;
    const labelX = pointA.x + Math.cos(labelAngle) * (angleArcRadius + 18);
    const labelY = pointA.y + Math.sin(labelAngle) * (angleArcRadius + 18);
    ctx.font = "bold 14px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.fillStyle = "#60A5FA";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${angle.toFixed(1)}°`, labelX, labelY);

    const tensionBarWidth = 120;
    const tensionBarHeight = 6;
    const tensionBarX = width - tensionBarWidth - padding;
    const tensionBarY = padding + 10;

    ctx.fillStyle = "rgba(30, 58, 95, 0.8)";
    ctx.fillRect(
      tensionBarX - 8,
      tensionBarY - 20,
      tensionBarWidth + 16,
      tensionBarHeight + 40
    );

    ctx.font = "12px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.textAlign = "left";
    ctx.fillText("张力", tensionBarX, tensionBarY - 6);

    ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
    ctx.fillRect(tensionBarX, tensionBarY, tensionBarWidth, tensionBarHeight);

    const tensionRatio = Math.min(
      1,
      Math.max(0, tension / SAFETY_THRESHOLDS.TENSION_MAX)
    );
    const tensionGradient = ctx.createLinearGradient(
      tensionBarX,
      tensionBarY,
      tensionBarX + tensionBarWidth,
      tensionBarY
    );
    tensionGradient.addColorStop(0, "#10B981");
    tensionGradient.addColorStop(0.6, "#F59E0B");
    tensionGradient.addColorStop(1, "#EF4444");
    ctx.fillStyle = tensionGradient;
    ctx.fillRect(
      tensionBarX,
      tensionBarY,
      tensionBarWidth * tensionRatio,
      tensionBarHeight
    );

    ctx.font = "bold 12px PingFang SC, Microsoft YaHei, sans-serif";
    ctx.fillStyle = isTensionSafe ? "#34D399" : "#F97316";
    ctx.textAlign = "right";
    ctx.fillText(
      `${tension.toFixed(0)}kgf`,
      tensionBarX + tensionBarWidth,
      tensionBarY + tensionBarHeight + 14
    );
  }, [angle, tension, isOverallSafe, isTensionSafe]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/50">
            <div>
              <div className="text-xs text-slate-400">绳索角度</div>
              <div
                className={cn(
                  "text-3xl font-bold tracking-tight",
                  isAngleSafe ? "text-emerald-400" : "text-orange-400"
                )}
              >
                {angle.toFixed(1)}°
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">绳长</div>
              <div className="text-lg font-semibold text-slate-200">
                {length.toFixed(1)}m
              </div>
            </div>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full rounded-xl bg-slate-900 border border-slate-700/50"
          )}
          style={{ height: "280px" }}
        />
      </div>

      <div className="lg:w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-primary-500" />
          <h3 className="text-sm font-semibold text-slate-900">明细解释</h3>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">角度评估</div>
            <div className="text-sm font-medium text-slate-800 leading-relaxed">
              {angle.toFixed(0)}° 处于安全区间 {SAFETY_THRESHOLDS.ANGLE_MIN}°~
              {SAFETY_THRESHOLDS.ANGLE_MAX}°，符合救援作业规范
            </div>
            {!isAngleSafe && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm font-semibold text-orange-700">
                ⚠️ 角度已超出安全阈值 {SAFETY_THRESHOLDS.ANGLE_MAX}°，请复核
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">张力评估</div>
            <div className="text-sm font-medium text-slate-800 leading-relaxed">
              张力 {tension.toFixed(0)}kgf
              {isTensionSafe
                ? `，低于安全阈值 ${SAFETY_THRESHOLDS.TENSION_MAX}kgf`
                : `，已超过安全阈值 ${SAFETY_THRESHOLDS.TENSION_MAX}kgf`}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">综合状态</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium",
                  isOverallSafe
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-orange-50 text-orange-700 border border-orange-100"
                )}
              >
                {isOverallSafe ? "● 安全" : "● 需关注"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
