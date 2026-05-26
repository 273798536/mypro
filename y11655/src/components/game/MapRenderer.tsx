import React, { useState, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Station, Route, Vehicle } from '../../types';

interface MapRendererProps {
  onStationClick?: (station: Station) => void;
  onRouteClick?: (route: Route) => void;
  selectedRouteId?: string;
  rerouteMode?: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = ({
  onStationClick,
  onRouteClick,
  selectedRouteId,
  rerouteMode = false,
}) => {
  const { stations, routes, vehicles, events } = useGameStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getVehiclePosition = (vehicle: Vehicle) => {
    const route = routes.find((r) => r.id === vehicle.routeId);
    if (!route || route.stations.length < 2) return { x: 0, y: 0 };

    const currentStationId = route.stations[vehicle.currentStationIndex];
    const nextStationIndex = (vehicle.currentStationIndex + 1) % route.stations.length;
    const nextStationId = route.stations[nextStationIndex];

    const currentStation = stations.find((s) => s.id === currentStationId);
    const nextStation = stations.find((s) => s.id === nextStationId);

    if (!currentStation || !nextStation) return { x: 0, y: 0 };

    const x = currentStation.x + (nextStation.x - currentStation.x) * vehicle.progress;
    const y = currentStation.y + (nextStation.y - currentStation.y) * vehicle.progress;

    return { x, y };
  };

  const renderRoute = (route: Route) => {
    if (route.stations.length < 2) return null;

    const pathData = route.stations
      .map((stationId, index) => {
        const station = stations.find((s) => s.id === stationId);
        if (!station) return '';
        return index === 0 ? `M ${station.x} ${station.y}` : `L ${station.x} ${station.y}`;
      })
      .join(' ');

    const isSelected = route.id === selectedRouteId;
    const strokeWidth = isSelected ? 4 : 2;

    return (
      <g key={route.id}>
        <path
          d={pathData}
          fill="none"
          stroke={route.color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
        />
        <path
          d={pathData}
          fill="none"
          stroke={route.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`cursor-pointer transition-all duration-200 ${isSelected ? 'drop-shadow-lg' : 'hover:opacity-80'}`}
          onClick={() => onRouteClick?.(route)}
          style={{
            strokeDasharray: route.status === 'detoured' ? '10,5' : 'none',
          }}
        />
      </g>
    );
  };

  const renderStation = (station: Station) => {
    const isBlocked = station.isBlocked;
    const hasEvent = events.some(
      (e) => !e.resolved && e.affectedArea.includes(station.id)
    );
    const isInSelectedRoute = selectedRouteId
      ? routes.find((r) => r.id === selectedRouteId)?.stations.includes(station.id)
      : false;

    return (
      <g
        key={station.id}
        className={`cursor-pointer transition-all duration-200 ${rerouteMode ? 'hover:scale-125' : ''}`}
        onClick={() => onStationClick?.(station)}
      >
        {isBlocked && (
          <circle
            cx={station.x}
            cy={station.y}
            r={18}
            fill="none"
            stroke="#EF4444"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
        {hasEvent && !isBlocked && (
          <circle
            cx={station.x}
            cy={station.y}
            r={16}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
        <circle
          cx={station.x}
          cy={station.y}
          r={isInSelectedRoute ? 10 : 8}
          fill={isBlocked ? '#EF4444' : isInSelectedRoute ? '#3B82F6' : '#475569'}
          stroke="#E2E8F0"
          strokeWidth={2}
          className="transition-all duration-200"
        />
        <text
          x={station.x}
          y={station.y + 24}
          textAnchor="middle"
          className="text-xs fill-dispatch-text-muted font-mono pointer-events-none"
        >
          {station.name}
        </text>
      </g>
    );
  };

  const renderVehicle = (vehicle: Vehicle) => {
    const pos = getVehiclePosition(vehicle);
    const route = routes.find((r) => r.id === vehicle.routeId);
    if (!route) return null;

    const isDelayed = vehicle.status === 'delayed' || vehicle.delayTime > 20;

    return (
      <g key={vehicle.id}>
        {isDelayed && (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={14}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            className="animate-pulse"
          />
        )}
        <rect
          x={pos.x - 10}
          y={pos.y - 6}
          width={20}
          height={12}
          rx={3}
          fill={route.color}
          stroke="#E2E8F0"
          strokeWidth={1.5}
          className="transition-all duration-300"
        />
        <text
          x={pos.x}
          y={pos.y - 10}
          textAnchor="middle"
          className="text-[10px] fill-dispatch-text font-mono pointer-events-none"
        >
          {vehicle.plateNumber.slice(-4)}
        </text>
      </g>
    );
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(0.5, Math.min(2, s * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !rerouteMode) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const mapWidth = Math.max(...stations.map((s) => s.x)) + 100;
  const mapHeight = Math.max(...stations.map((s) => s.y)) + 100;

  return (
    <div
      className="w-full h-full bg-dispatch-bg rounded-lg overflow-hidden relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1E293B" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {routes.map(renderRoute)}
        {stations.map(renderStation)}
        {vehicles.map(renderVehicle)}
      </svg>

      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setScale((s) => Math.min(2, s * 1.2))}
          className="w-8 h-8 bg-dispatch-panel border border-dispatch-border rounded text-dispatch-text hover:bg-dispatch-border transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.5, s * 0.8))}
          className="w-8 h-8 bg-dispatch-panel border border-dispatch-border rounded text-dispatch-text hover:bg-dispatch-border transition-colors"
        >
          −
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="w-8 h-8 bg-dispatch-panel border border-dispatch-border rounded text-dispatch-text hover:bg-dispatch-border transition-colors text-xs"
        >
          ⟳
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-dispatch-panel/90 backdrop-blur border border-dispatch-border rounded-lg px-3 py-2">
        <div className="text-xs text-dispatch-text-muted">缩放: {(scale * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};
