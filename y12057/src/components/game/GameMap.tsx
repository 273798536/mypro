import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, AlertTriangle, MapPin } from 'lucide-react';
import type { FestivalMap, CrowdParticle, Deployment, GameEvent } from '../../engine/types';
import { festivalMaps } from '../../data/maps';
import { securityUnits } from '../../data/patrols';

interface GameMapProps {
  mapId: string;
  particles: CrowdParticle[];
  deployments: Deployment[];
  events: GameEvent[];
  onMapClick?: (x: number, y: number) => void;
  onDeploymentClick?: (deployment: Deployment) => void;
  onEventClick?: (event: GameEvent) => void;
  selectedDeploymentId?: string | null;
  selectedEventId?: string | null;
  isPaused?: boolean;
  crowdDensity?: number[][];
}

const GRID_SIZE = 20;

export const GameMap: React.FC<GameMapProps> = ({
  mapId,
  particles,
  deployments,
  events,
  onMapClick,
  onDeploymentClick,
  onEventClick,
  selectedDeploymentId,
  selectedEventId,
  isPaused = false,
  crowdDensity = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
  const [draggingUnit, setDraggingUnit] = useState<string | null>(null);

  const map = festivalMaps.find(m => m.id === mapId) || festivalMaps[0];

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || !onMapClick) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const scaleX = map.width / rect.width;
    const scaleY = map.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    onMapClick(x, y);
  }, [onMapClick, map.width, map.height]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const scaleX = map.width / rect.width;
    const scaleY = map.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setHoveredPosition({ x: Math.round(x), y: Math.round(y) });
  }, [map.width, map.height]);

  const getElementColor = (type: string) => {
    switch (type) {
      case 'stage': return 'bg-purple-600/80 border-purple-400';
      case 'exit': return 'bg-red-600/80 border-red-400';
      case 'entrance': return 'bg-green-600/80 border-green-400';
      case 'barrier': return 'bg-gray-600/80 border-gray-400';
      case 'food': return 'bg-yellow-600/80 border-yellow-400';
      case 'restroom': return 'bg-blue-600/80 border-blue-400';
      default: return 'bg-gray-500/80 border-gray-300';
    }
  };

  const getDensityColor = (density: number) => {
    if (density < 3) return 'rgba(34, 197, 94, 0.1)';
    if (density < 6) return 'rgba(234, 179, 8, 0.2)';
    if (density < 10) return 'rgba(249, 115, 22, 0.3)';
    return 'rgba(239, 68, 68, 0.4)';
  };

  const getDeploymentIcon = (unitType: string) => {
    switch (unitType) {
      case 'fixed_post': return Shield;
      case 'patrol': return Users;
      case 'emergency_response': return AlertTriangle;
      default: return Shield;
    }
  };

  const getDeploymentColor = (unitType: string) => {
    switch (unitType) {
      case 'fixed_post': return 'bg-blue-500';
      case 'patrol': return 'bg-green-500';
      case 'emergency_response': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-700';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const unresolvedEvents = events.filter(e => !e.resolved);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <div
        ref={mapRef}
        className="relative w-full h-full cursor-crosshair"
        style={{
          aspectRatio: `${map.width}/${map.height}`,
          maxHeight: 'calc(100vh - 200px)'
        }}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPosition(null)}
      >
        <div className="absolute inset-0 bg-slate-800">
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
            <defs>
              <pattern id="grid" width={`${100 / (map.width / GRID_SIZE)}%`} height={`${100 / (map.height / GRID_SIZE)}%`} patternUnits="objectBoundingBox">
                <path d={`M ${100 / (map.width / GRID_SIZE)} 0 L 0 0 0 ${100 / (map.height / GRID_SIZE)}`} fill="none" stroke="#475569" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {isPaused && (
          <div className="absolute inset-0 bg-slate-900/50 pointer-events-none z-10">
            <div className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)'
            }} />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 rounded text-yellow-400 font-bold text-sm">
              已暂停
            </div>
          </div>
        )}

        {crowdDensity.map((row, y) =>
          row.map((density, x) => (
            <div
              key={`density-${x}-${y}`}
              className="absolute transition-colors duration-500"
              style={{
                left: `${(x * GRID_SIZE / map.width) * 100}%`,
                top: `${(y * GRID_SIZE / map.height) * 100}%`,
                width: `${(GRID_SIZE / map.width) * 100}%`,
                height: `${(GRID_SIZE / map.height) * 100}%`,
                backgroundColor: getDensityColor(density)
              }}
            />
          ))
        )}

        {map.elements.map(element => (
          <motion.div
            key={element.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`absolute border-2 rounded ${getElementColor(element.type)} flex items-center justify-center`}
            style={{
              left: `${(element.x / map.width) * 100}%`,
              top: `${(element.y / map.height) * 100}%`,
              width: `${(element.width / map.width) * 100}%`,
              height: `${(element.height / map.height) * 100}%`
            }}
          >
            <span className="text-white text-xs font-bold text-center px-1 drop-shadow-lg">
              {element.name}
            </span>
          </motion.div>
        ))}

        <AnimatePresence>
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.8,
                scale: 0.8 + particle.density * 0.05
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
              style={{
                left: `${(particle.x / map.width) * 100}%`,
                top: `${(particle.y / map.height) * 100}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: particle.density > 5 ? '0 0 6px 2px rgba(251, 146, 60, 0.5)' : 'none'
              }}
            />
          ))}
        </AnimatePresence>

        {deployments.map(deployment => {
          const Icon = getDeploymentIcon(deployment.unitType);
          const isSelected = deployment.id === selectedDeploymentId;
          const unit = securityUnits.find(u => u.type === deployment.unitType);
          
          return (
            <motion.div
              key={deployment.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onDeploymentClick?.(deployment);
              }}
              className={`absolute cursor-pointer transition-all ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
              style={{
                left: `${(deployment.x / map.width) * 100}%`,
                top: `${(deployment.y / map.height) * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className={`${getDeploymentColor(deployment.unitType)} p-1.5 rounded-lg`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-white bg-slate-800/90 px-1 rounded whitespace-nowrap">
                {unit?.name} ×{deployment.count}
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {unresolvedEvents.map(event => {
            if (!event.location) return null;
            const isSelected = event.id === selectedEventId;
            
            return (
              <motion.div
                key={event.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: 1
                }}
                transition={{
                  scale: {
                    repeat: Infinity,
                    duration: 2
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={`absolute cursor-pointer ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                  left: `${(event.location.x / map.width) * 100}%`,
                  top: `${(event.location.y / map.height) * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`${getEventColor(event.severity)} p-2 rounded-full animate-pulse`}>
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white bg-slate-800/95 px-2 py-0.5 rounded whitespace-nowrap max-w-32 overflow-hidden text-ellipsis">
                  {event.title}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hoveredPosition && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-800/90 rounded text-xs text-slate-300 font-mono">
            位置: ({hoveredPosition.x}, {hoveredPosition.y})
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-purple-600 rounded" />
            <span className="text-slate-300">舞台</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-red-600 rounded" />
            <span className="text-slate-300">出口</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded">
            <div className="w-3 h-3 bg-green-600 rounded" />
            <span className="text-slate-300">入口</span>
          </div>
        </div>
      </div>
    </div>
  );
};
