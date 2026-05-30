import React, { useRef, useEffect, useCallback } from "react";
import type { CrowdParticle, FloorPlan, ExitFlowInfo } from "@/types";

interface FloorMapProps {
  floor: FloorPlan;
  crowdState: CrowdParticle[];
  exitFlows: ExitFlowInfo[];
  fireRadius: number;
  width?: number;
  height?: number;
}

const CELL_SIZE = 32;

export default function FloorMap({
  floor,
  crowdState,
  exitFlows,
  fireRadius,
  width,
  height,
}: FloorMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const canvasW = width ?? floor.width * CELL_SIZE;
  const canvasH = height ?? floor.height * CELL_SIZE;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = canvasW / floor.width;
    const scaleY = canvasH / floor.height;

    ctx.clearRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, canvasW, canvasH);

    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const cell = floor.grid[y]?.[x];
        if (cell === 1) {
          ctx.fillStyle = "#2d3748";
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
      }
    }

    ctx.strokeStyle = "#1a2332";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= floor.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scaleX, 0);
      ctx.lineTo(x * scaleX, canvasH);
      ctx.stroke();
    }
    for (let y = 0; y <= floor.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scaleY);
      ctx.lineTo(canvasW, y * scaleY);
      ctx.stroke();
    }

    const fx = floor.fireSource.x * scaleX;
    const fy = floor.fireSource.y * scaleY;
    const fr = fireRadius * Math.min(scaleX, scaleY);
    const fireGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    fireGrad.addColorStop(0, "rgba(255, 50, 0, 0.8)");
    fireGrad.addColorStop(0.5, "rgba(255, 120, 0, 0.4)");
    fireGrad.addColorStop(1, "rgba(255, 120, 0, 0)");
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    for (const exit of floor.exits) {
      const ex = exit.x * scaleX;
      const ey = exit.y * scaleY;

      const flow = exitFlows.find((f) => f.exitId === exit.id);
      const congestionLevel = flow?.congestionLevel ?? 0;

      let color = "#00c853";
      if (congestionLevel > 1.2) color = "#d32f2f";
      else if (congestionLevel > 0.8) color = "#ff6b35";
      else if (congestionLevel > 0.5) color = "#fbc02d";

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx.stroke();

      const arrows: Record<string, [number, number]> = {
        north: [0, -12],
        south: [0, 12],
        east: [12, 0],
        west: [-12, 0],
      };
      const [adx, ady] = arrows[exit.direction] ?? [0, 0];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + adx, ey + ady);
      ctx.stroke();

      ctx.fillStyle = "#e0e0e0";
      ctx.font = "9px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.fillText(exit.id.replace("exit-", ""), ex, ey - 12);
    }

    for (const elev of floor.elevators) {
      const ex = elev.x * scaleX;
      const ey = elev.y * scaleY;

      ctx.fillStyle = "#4fc3f7";
      ctx.fillRect(ex - 6, ey - 6, 12, 12);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(ex - 6, ey - 6, 12, 12);

      ctx.fillStyle = "#1a1a2e";
      ctx.font = "bold 8px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("E", ex, ey);
      ctx.textBaseline = "alphabetic";
    }

    for (const stair of floor.stairs) {
      const sx = stair.x * scaleX;
      const sy = stair.y * scaleY;

      ctx.fillStyle = "#7c4dff";
      ctx.fillRect(sx - 5, sy - 5, 10, 10);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sx - 5, sy - 5, 10, 10);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", sx, sy);
      ctx.textBaseline = "alphabetic";
    }

    const floorCrowd = crowdState.filter((p) => p.floorId === floor.id && !p.evacuated);

    for (const p of floorCrowd) {
      const px = p.x * scaleX;
      const py = p.y * scaleY;

      let pColor = "#4fc3f7";
      if (p.usingElevator) pColor = "#fbc02d";
      else if (p.stuck) pColor = "#d32f2f";
      else {
        const distToFire = Math.hypot(
          p.x - floor.fireSource.x,
          p.y - floor.fireSource.y
        );
        if (distToFire < fireRadius + 1) pColor = "#ff6b35";
      }

      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const evacuatedOnFloor = crowdState.filter(
      (p) => p.floorId === floor.id && p.evacuated
    ).length;
    ctx.fillStyle = "#00c85380";
    ctx.font = "11px 'JetBrains Mono'";
    ctx.textAlign = "right";
    ctx.fillText(`已疏散: ${evacuatedOnFloor}`, canvasW - 8, 16);

  }, [floor, crowdState, exitFlows, fireRadius, canvasW, canvasH]);

  useEffect(() => {
    const animate = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      className="rounded-lg border border-gray-700/50"
    />
  );
}
