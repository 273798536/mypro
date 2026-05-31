import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Cargo, BallastTank, ShipState, LevelConfig } from '@/types';
import { CARGO_COLORS } from '@/types';

interface ShipCanvasProps {
  cargos: Cargo[];
  tanks: BallastTank[];
  shipState: ShipState;
  config: LevelConfig;
  onDropCargo: (cargoId: string, row: number, col: number) => void;
  onMoveCargo: (cargoId: string, row: number, col: number) => void;
  onUnloadCargo: (cargoId: string) => void;
  draggedCargoId: string | null;
  onGridClick?: (row: number, col: number) => void;
}

function ShipCanvas({
  cargos,
  tanks,
  shipState,
  config,
  onDropCargo,
  onMoveCargo,
  onUnloadCargo,
  draggedCargoId,
  onGridClick,
}: ShipCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const animFrameRef = useRef<number>(0);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const getLayout = useCallback(() => {
    const { width, height } = canvasSize;
    const padding = 50;
    const draftRulerWidth = 50;
    const availWidth = width - padding * 2 - draftRulerWidth;
    const availHeight = height - padding * 2;
    const hullHeight = availHeight * 0.75;
    const deckWidth = availWidth * 0.65;
    const keelWidth = deckWidth * 0.35;
    const hullCenterX = padding + availWidth / 2;
    const hullTop = padding + availHeight * 0.15;
    const hullBottom = hullTop + hullHeight;
    const gridPad = 8;
    const gridTop = hullTop + gridPad;
    const gridBottom = hullBottom - gridPad;
    const gridHeight = gridBottom - gridTop;
    const gridWidth = deckWidth - gridPad * 2;
    const gridLeft = hullCenterX - gridWidth / 2;
    const cellWidth = gridWidth / config.gridCols;
    const cellHeight = gridHeight / config.gridRows;

    return {
      width, height, padding, draftRulerWidth,
      hullCenterX, hullTop, hullBottom, hullHeight,
      deckWidth, keelWidth,
      gridLeft, gridTop, gridBottom, gridWidth, gridHeight,
      cellWidth, cellHeight,
    };
  }, [canvasSize, config.gridRows, config.gridCols]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, timestamp: number) => {
      const layout = getLayout();
      const {
        width, height, hullCenterX, hullTop, hullBottom, hullHeight,
        deckWidth, keelWidth, gridLeft, gridTop, gridBottom, gridWidth,
        cellWidth, cellHeight, draftRulerWidth, padding,
      } = layout;
      const dpr = window.devicePixelRatio || 1;

      ctx.clearRect(0, 0, width * dpr, height * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#0A1628';
      ctx.fillRect(0, 0, width, height);

      const heelRad = (shipState.currentHeelAngle * Math.PI) / 180;
      const pivotX = hullCenterX;
      const pivotY = hullTop + hullHeight * 0.4;

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(heelRad);
      ctx.translate(-pivotX, -pivotY);

      ctx.beginPath();
      ctx.moveTo(hullCenterX - deckWidth / 2, hullTop);
      ctx.lineTo(hullCenterX + deckWidth / 2, hullTop);
      ctx.lineTo(hullCenterX + keelWidth / 2, hullBottom);
      ctx.lineTo(hullCenterX - keelWidth / 2, hullBottom);
      ctx.closePath();
      ctx.fillStyle = '#1A2D4A';
      ctx.fill();
      ctx.strokeStyle = '#3A5A8A';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(58, 90, 138, 0.35)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= config.gridRows; r++) {
        const y = gridTop + r * cellHeight;
        ctx.beginPath();
        ctx.moveTo(gridLeft, y);
        ctx.lineTo(gridLeft + gridWidth, y);
        ctx.stroke();
      }
      for (let c = 0; c <= config.gridCols; c++) {
        const x = gridLeft + c * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, gridTop);
        ctx.lineTo(x, gridBottom);
        ctx.stroke();
      }

      if (draggedCargoId && hoverCell) {
        const hx = gridLeft + hoverCell.col * cellWidth;
        const hy = gridTop + hoverCell.row * cellHeight;
        const occupied = cargos.some(c => c.loaded && c.position?.row === hoverCell.row && c.position?.col === hoverCell.col);
        ctx.fillStyle = occupied ? 'rgba(239, 68, 68, 0.2)' : 'rgba(232, 96, 44, 0.25)';
        ctx.fillRect(hx + 1, hy + 1, cellWidth - 2, cellHeight - 2);
        if (!occupied) {
          ctx.strokeStyle = 'rgba(232, 96, 44, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(hx + 1, hy + 1, cellWidth - 2, cellHeight - 2);
        }
      }

      const loadedCargos = cargos.filter((c) => c.loaded && c.position);
      for (const cargo of loadedCargos) {
        const { row, col } = cargo.position!;
        const x = gridLeft + col * cellWidth;
        const y = gridTop + row * cellHeight;
        ctx.fillStyle = CARGO_COLORS[cargo.category];
        ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
        if (cellWidth > 40 && cellHeight > 20) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = `bold ${Math.min(11, cellHeight * 0.3)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cargo.name.slice(0, 4), x + cellWidth / 2, y + cellHeight / 2);
        }
      }

      const cog = shipState.centerOfGravity;
      const cogX = hullCenterX + cog.x * deckWidth * 0.8;
      const cogY = hullTop + hullHeight * 0.5 - cog.y * hullHeight * 0.3;
      const crossSize = 12;

      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cogX - crossSize, cogY);
      ctx.lineTo(cogX + crossSize, cogY);
      ctx.moveTo(cogX, cogY - crossSize);
      ctx.lineTo(cogX, cogY + crossSize);
      ctx.stroke();

      ctx.strokeStyle = '#FF4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cogX, cogY, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 68, 68, 0.7)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CG', cogX, cogY - 14);

      ctx.restore();

      const draftRatio = Math.min(shipState.draftDepth / shipState.maxDraft, 1);
      const waterY = hullTop + hullHeight * (1 - draftRatio);
      const waveAmplitude = 3;
      const waveFrequency = 0.02;
      const waveSpeed = 0.002;
      const t = timestamp * waveSpeed;

      ctx.fillStyle = 'rgba(30, 144, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, waterY);
      for (let x = 0; x <= width; x += 2) {
        const y = waterY + Math.sin(x * waveFrequency + t) * waveAmplitude;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = waterY + Math.sin(x * waveFrequency + t) * waveAmplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const indicatorX = width - padding - draftRulerWidth + 20;
      const indicatorTop = hullTop;
      const indicatorBottom = hullBottom;
      const indicatorHeight = indicatorBottom - indicatorTop;

      ctx.strokeStyle = '#5A7A9A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(indicatorX, indicatorTop);
      ctx.lineTo(indicatorX, indicatorBottom);
      ctx.stroke();

      for (let i = 0; i <= 10; i++) {
        const tickY = indicatorTop + (indicatorHeight * i) / 10;
        const tickLen = i % 5 === 0 ? 10 : 5;
        ctx.strokeStyle = '#5A7A9A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(indicatorX - tickLen, tickY);
        ctx.lineTo(indicatorX, tickY);
        ctx.stroke();
      }

      ctx.strokeStyle = '#FF6644';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(indicatorX - 10, indicatorBottom);
      ctx.lineTo(indicatorX + 10, indicatorBottom);
      ctx.stroke();

      const draftIndicatorY = indicatorTop + indicatorHeight * (1 - draftRatio);
      ctx.strokeStyle = '#44FF44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(indicatorX - 10, draftIndicatorY);
      ctx.lineTo(indicatorX + 10, draftIndicatorY);
      ctx.stroke();

      ctx.fillStyle = '#8899AA';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MAX', indicatorX + 12, indicatorBottom + 4);
      ctx.fillStyle = '#66DD66';
      ctx.fillText(`${shipState.draftDepth.toFixed(1)}m`, indicatorX + 12, draftIndicatorY + 4);

      ctx.restore();
    },
    [getLayout, cargos, shipState, config.gridRows, config.gridCols, draggedCargoId, hoverCell]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;
    const animate = (timestamp: number) => {
      if (!running) return;
      draw(ctx, timestamp);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [draw, canvasSize]);

  const getGridCell = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const layout = getLayout();
      const { gridLeft, gridTop, cellWidth, cellHeight } = layout;
      const col = Math.floor((mx - gridLeft) / cellWidth);
      const row = Math.floor((my - gridTop) / cellHeight);
      if (row < 0 || row >= config.gridRows || col < 0 || col >= config.gridCols) return null;
      return { row, col };
    },
    [getLayout, config.gridRows, config.gridCols]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getGridCell(e);
      if (!cell) return;
      if (onGridClick) {
        onGridClick(cell.row, cell.col);
      } else if (draggedCargoId) {
        const clickedCargo = cargos.find(
          (c) => c.loaded && c.position && c.position.row === cell.row && c.position.col === cell.col
        );
        if (!clickedCargo) {
          onDropCargo(draggedCargoId, cell.row, cell.col);
        }
      }
    },
    [getGridCell, onGridClick, draggedCargoId, cargos, onDropCargo]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = getGridCell(e);
      setHoverCell(cell);
    },
    [getGridCell]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const cell = getGridCell(e);
      if (!cell) return;
      const clickedCargo = cargos.find(
        (c) => c.loaded && c.position && c.position.row === cell.row && c.position.col === cell.col
      );
      if (clickedCargo) {
        onUnloadCargo(clickedCargo.id);
      }
    },
    [getGridCell, cargos, onUnloadCargo]
  );

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', cursor: draggedCargoId ? 'crosshair' : 'default' }}
      />
    </div>
  );
}

export default React.memo(ShipCanvas);
