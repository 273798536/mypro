import React, { useEffect, useRef, useCallback } from 'react';
import { ExperimentParams, ForceAnalysis } from '../../types';
import { getAngleInRadians, toDegrees } from '../../utils/physics';

interface InclineCanvasProps {
  params: ExperimentParams;
  analysis: ForceAnalysis | null;
  blockPosition: number;
  isAnimating: boolean;
  animationSpeed: number;
  onPositionChange: (position: number) => void;
  showForces?: boolean;
}

const COLORS = {
  incline: '#4a5568',
  inclineTop: '#718096',
  block: '#f97316',
  blockBorder: '#ea580c',
  gravity: '#ef4444',
  normal: '#10b981',
  friction: '#3b82f6',
  external: '#8b5cf6',
  grid: '#e2e8f0',
  text: '#1a202c',
  arrow: '#4b5563',
};

export const InclineCanvas: React.FC<InclineCanvasProps> = ({
  params,
  analysis,
  blockPosition,
  isAnimating,
  animationSpeed,
  onPositionChange,
  showForces = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const positionRef = useRef(blockPosition);

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      color: string,
      label?: string,
      labelOffsetX: number = 0,
      labelOffsetY: number = 0
    ) => {
      const headLength = 10;
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(label, toX + labelOffsetX, toY + labelOffsetY);
      }
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const inclineLength = Math.min(width - padding * 2, 400);
    const angleRad = getAngleInRadians(params);
    const inclineHeight = inclineLength * Math.sin(angleRad);
    const baseLength = inclineLength * Math.cos(angleRad);

    const startX = padding + (width - padding * 2 - baseLength) / 2;
    const startY = height - padding;
    const endX = startX + baseLength;
    const endY = startY - inclineHeight;

    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, COLORS.incline);
    gradient.addColorStop(1, COLORS.inclineTop);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = COLORS.incline;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY + 20);
    ctx.lineTo(startX + 20, startY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + baseLength, startY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (angleRad > 0.1) {
      ctx.strokeStyle = COLORS.arrow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const arcRadius = 40;
      ctx.arc(startX, startY, arcRadius, -angleRad, 0, false);
      ctx.stroke();

      ctx.fillStyle = COLORS.text;
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `θ = ${params.angle}${params.angleUnit === 'degree' ? '°' : ' rad'}`,
        startX + arcRadius + 10,
        startY - arcRadius / 2
      );
    }

    const blockSize = Math.min(50, baseLength * 0.15);
    const blockX = startX + blockPosition * (baseLength - blockSize);
    const blockY = endY + (startY - endY) * blockPosition * (baseLength - blockSize) / baseLength - blockSize / 2;

    const blockCenterX = blockX + blockSize / 2;
    const blockCenterY = blockY + blockSize / 2;

    ctx.save();
    ctx.translate(blockCenterX, blockCenterY);
    ctx.rotate(angleRad);
    ctx.translate(-blockCenterX, -blockCenterY);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    const blockGradient = ctx.createLinearGradient(blockX, blockY, blockX, blockY + blockSize);
    blockGradient.addColorStop(0, '#ffa94d');
    blockGradient.addColorStop(1, COLORS.block);

    ctx.fillStyle = blockGradient;
    ctx.strokeStyle = COLORS.blockBorder;
    ctx.lineWidth = 2;
    ctx.fillRect(blockX, blockY, blockSize, blockSize);
    ctx.strokeRect(blockX, blockY, blockSize, blockSize);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${params.mass}kg`, blockCenterX, blockCenterY + 4);

    ctx.restore();

    if (showForces && analysis) {
      const forceScale = 30 / Math.max(analysis.gravity, 10);
      const arrowBaseX = blockCenterX;
      const arrowBaseY = blockCenterY;

      const gravityLength = analysis.gravity * forceScale;
      drawArrow(
        ctx,
        arrowBaseX,
        arrowBaseY,
        arrowBaseX,
        arrowBaseY + gravityLength,
        COLORS.gravity,
        'G',
        15,
        10
      );

      const normalLength = analysis.normalForce * forceScale;
      const normalAngle = -Math.PI / 2 - angleRad;
      drawArrow(
        ctx,
        arrowBaseX,
        arrowBaseY,
        arrowBaseX + normalLength * Math.cos(normalAngle),
        arrowBaseY + normalLength * Math.sin(normalAngle),
        COLORS.normal,
        'N',
        15 * Math.cos(normalAngle),
        15 * Math.sin(normalAngle)
      );

      const frictionLength = Math.abs(analysis.frictionForce) * forceScale;
      const frictionAngle = analysis.frictionForce > 0 ? -angleRad : Math.PI - angleRad;
      if (frictionLength > 5) {
        drawArrow(
          ctx,
          arrowBaseX,
          arrowBaseY,
          arrowBaseX + frictionLength * Math.cos(frictionAngle),
          arrowBaseY + frictionLength * Math.sin(frictionAngle),
          COLORS.friction,
          'f',
          15 * Math.cos(frictionAngle),
          15 * Math.sin(frictionAngle)
        );
      }

      if (params.externalForce > 0) {
        const extLength = params.externalForce * forceScale;
        const extAngle = -angleRad - params.externalForceAngle * Math.PI / 180;
        drawArrow(
          ctx,
          arrowBaseX,
          arrowBaseY,
          arrowBaseX + extLength * Math.cos(extAngle),
          arrowBaseY + extLength * Math.sin(extAngle),
          COLORS.external,
          'F',
          15 * Math.cos(extAngle),
          15 * Math.sin(extAngle)
        );
      }
    }
  }, [params, analysis, blockPosition, showForces, drawArrow]);

  useEffect(() => {
    positionRef.current = blockPosition;
  }, [blockPosition]);

  useEffect(() => {
    if (!isAnimating || !analysis) {
      draw();
      return;
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (analysis.status !== 'static') {
        const velocity = analysis.acceleration * animationSpeed;
        const deltaPos = velocity * deltaTime / 10;

        positionRef.current += deltaPos;

        if (positionRef.current > 1) {
          positionRef.current = 0;
        } else if (positionRef.current < 0) {
          positionRef.current = 1;
        }

        onPositionChange(positionRef.current);
      }

      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, analysis, animationSpeed, onPositionChange, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full h-auto rounded-lg shadow-inner bg-gradient-to-b from-slate-50 to-white"
      style={{ maxWidth: '600px' }}
    />
  );
};
