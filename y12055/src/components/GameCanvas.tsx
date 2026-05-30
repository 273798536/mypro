import { useRef, useEffect, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { MAX_DEPTH, WORLD_WIDTH, TARGET_DEPTH, OBSTACLES } from "@/physics/constants";

const COLORS = {
  sky: "#1a1a2e",
  surfaceWater: "#1b4965",
  deepWater: "#0a2463",
  densityZone: "rgba(62, 146, 204, 0.15)",
  densityZoneBorder: "rgba(62, 146, 204, 0.4)",
  grid: "rgba(255, 255, 255, 0.06)",
  gridLabel: "rgba(255, 255, 255, 0.3)",
  submarine: "#e9b44c",
  submarineStroke: "#c49a3c",
  submarineWindow: "#3e92cc",
  ballastWater: "rgba(30, 100, 200, 0.7)",
  ballastEmpty: "rgba(200, 200, 200, 0.1)",
  treasure: "#e9b44c",
  treasureGlow: "rgba(233, 180, 76, 0.3)",
  obstacle: "rgba(100, 60, 30, 0.6)",
  obstacleStroke: "rgba(150, 90, 50, 0.8)",
  targetLine: "rgba(76, 209, 55, 0.5)",
  targetLabel: "rgba(76, 209, 55, 0.8)",
  danger: "rgba(216, 49, 91, 0.6)",
  warning: "rgba(255, 165, 0, 0.8)",
  bubble: "rgba(255, 255, 255, 0.15)",
};

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  const engine = useGameStore((s) => s.engine);
  const isReplaying = useGameStore((s) => s.isReplaying);
  const replayFrame = useGameStore((s) => s.replayFrame);
  const session = useGameStore((s) => s.session);

  const getSnapshotAtFrame = useGameStore((s) => s.getSnapshotAtFrame);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const ppm = height / MAX_DEPTH;
      const hppm = width / WORLD_WIDTH;

      let state = engine;
      if (isReplaying && session) {
        const snap = getSnapshotAtFrame(replayFrame);
        if (snap) {
          state = {
            submarine: snap.submarine,
            ballastTank: snap.ballastTank,
            treasureChest: snap.treasureChest,
            environment: snap.environment,
            settings: engine.settings,
            buoyancy: snap.buoyancy,
            frame: snap.frame,
            result: snap.result,
            phase: snap.result ? "ended" : "playing",
            warnings: [],
            lastOperation: snap.operation,
          };
        }
      }

      const { submarine, ballastTank, treasureChest, environment } = state;

      ctx.clearRect(0, 0, width, height);

      const surfaceY = 0 * ppm;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, COLORS.sky);
      gradient.addColorStop(surfaceY / height, COLORS.surfaceWater);
      gradient.addColorStop(0.3, COLORS.surfaceWater);
      gradient.addColorStop(1, COLORS.deepWater);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let d = 5; d <= MAX_DEPTH; d += 5) {
        const y = d * ppm;
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        ctx.fillStyle = COLORS.gridLabel;
        ctx.font = "10px monospace";
        ctx.fillText(`${d}m`, 4, y - 3);
      }

      for (const zone of environment.densityZones) {
        const zy = zone.startY * ppm;
        const zh = (zone.endY - zone.startY) * ppm;
        ctx.fillStyle = COLORS.densityZone;
        ctx.fillRect(0, zy, width, zh);
        ctx.strokeStyle = COLORS.densityZoneBorder;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(0, zy, width, zh);
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.densityZoneBorder;
        ctx.font = "bold 11px monospace";
        ctx.fillText(`ρ=${zone.density} kg/m³`, width - 130, zy + 16);
      }

      const ty = TARGET_DEPTH * ppm;
      ctx.strokeStyle = COLORS.targetLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(width, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.targetLabel;
      ctx.font = "bold 12px monospace";
      ctx.fillText(`目标深度 ${TARGET_DEPTH}m`, width - 160, ty - 6);

      for (const obs of OBSTACLES) {
        const ox = obs.x * hppm;
        const oy = obs.y * ppm;
        const ow = obs.width * hppm;
        const oh = obs.height * ppm;

        ctx.fillStyle = COLORS.obstacle;
        ctx.beginPath();
        ctx.roundRect(ox, oy, ow, oh, 4);
        ctx.fill();
        ctx.strokeStyle = COLORS.obstacleStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (treasureChest && !treasureChest.collected) {
        const tx = treasureChest.x * hppm;
        const tty = treasureChest.y * ppm;
        const tw = 24;
        const th = 18;

        const glowIntensity = 0.3 + 0.15 * Math.sin(frameCountRef.current * 0.05);
        ctx.fillStyle = `rgba(233, 180, 76, ${glowIntensity})`;
        ctx.beginPath();
        ctx.arc(tx, tty, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.treasure;
        ctx.fillRect(tx - tw / 2, tty - th / 2, tw, th);
        ctx.strokeStyle = "#c49a3c";
        ctx.lineWidth = 2;
        ctx.strokeRect(tx - tw / 2, tty - th / 2, tw, th);

        ctx.strokeStyle = "#c49a3c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2, tty);
        ctx.lineTo(tx + tw / 2, tty);
        ctx.stroke();

        ctx.fillStyle = "#c49a3c";
        ctx.fillRect(tx - 4, tty - th / 2 - 2, 8, 4);
      }

      const sx = submarine.x * hppm;
      const sy = Math.max(submarine.y * ppm, 10);
      const subW = 60;
      const subH = 24;

      ctx.save();
      ctx.translate(sx, sy);

      const tilt = submarine.vx * 0.02;
      ctx.rotate(tilt);

      ctx.fillStyle = COLORS.submarine;
      ctx.strokeStyle = COLORS.submarineStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, subW / 2, subH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.submarineStroke;
      ctx.beginPath();
      ctx.moveTo(-subW / 2, -3);
      ctx.lineTo(-subW / 2 - 15, -10);
      ctx.lineTo(-subW / 2 - 15, -5);
      ctx.lineTo(-subW / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-subW / 2, 3);
      ctx.lineTo(-subW / 2 - 15, 10);
      ctx.lineTo(-subW / 2 - 15, 5);
      ctx.lineTo(-subW / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = COLORS.submarineWindow;
      ctx.beginPath();
      ctx.arc(subW / 4, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(subW / 4 - 10, -2, 4, 0, Math.PI * 2);
      ctx.fill();

      const tankFill = ballastTank.currentWater / ballastTank.maxVolume;
      const tankX = -10;
      const tankY = 2;
      const tankW = 20;
      const tankH = 8;

      ctx.fillStyle = COLORS.ballastEmpty;
      ctx.fillRect(tankX, tankY, tankW, tankH);
      ctx.fillStyle = COLORS.ballastWater;
      ctx.fillRect(tankX, tankY + tankH * (1 - tankFill), tankW, tankH * tankFill);
      ctx.strokeStyle = COLORS.submarineStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(tankX, tankY, tankW, tankH);

      ctx.restore();

      const bubbleCount = 3;
      for (let i = 0; i < bubbleCount; i++) {
        const bx = sx + Math.sin(frameCountRef.current * 0.03 + i * 2) * 15 - 20;
        const by = sy - 20 - ((frameCountRef.current * 0.5 + i * 30) % 60);
        const br = 2 + Math.sin(frameCountRef.current * 0.05 + i) * 1;
        if (submarine.y > 1) {
          ctx.fillStyle = COLORS.bubble;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (state.warnings.length > 0) {
        const warnAlpha = 0.5 + 0.3 * Math.sin(frameCountRef.current * 0.1);
        ctx.fillStyle = `rgba(216, 49, 91, ${warnAlpha * 0.15})`;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = COLORS.warning;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(state.warnings.join(" | "), width / 2, 30);
        ctx.textAlign = "left";
      }

      if (state.result) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = "center";
        if (state.result.success) {
          ctx.fillStyle = "#4cd137";
          ctx.font = "bold 28px monospace";
          ctx.fillText("任务成功！", width / 2, height / 2 - 20);
        } else {
          ctx.fillStyle = "#d8315b";
          ctx.font = "bold 28px monospace";
          ctx.fillText("任务失败", width / 2, height / 2 - 20);
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.fillText(state.result.message, width / 2, height / 2 + 15);
        ctx.textAlign = "left";
      }
    },
    [engine, isReplaying, replayFrame, session, getSnapshotAtFrame]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    const render = () => {
      if (!running) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      frameCountRef.current++;
      draw(ctx, rect.width, rect.height);
      animFrameRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg"
      style={{ display: "block" }}
    />
  );
}
