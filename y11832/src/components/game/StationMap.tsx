import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getStationMap } from '../../data/stationMaps';
import { getLevel } from '../../data/levels';
import { getLocationCenter } from '../../utils/locationUtils';

interface StationMapProps {
  highlightLocationId?: string | null;
  onLocationClick?: (locationId: string) => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  highlightLocationId,
  onLocationClick,
}) => {
  const levelId = useGameStore((state) => state.levelId);
  const gates = useGameStore((state) => state.gates);
  const exits = useGameStore((state) => state.exits);
  const passengers = useGameStore((state) => state.passengers);
  const lockdownAreas = useGameStore((state) => state.lockdownAreas);
  const diversionRoutes = useGameStore((state) => state.diversionRoutes);
  const selectedLocationId = useGameStore((state) => state.selectedLocationId);
  const activeRipple = useGameStore((state) => state.activeRipple);
  const setSelectedLocation = useGameStore((state) => state.setSelectedLocation);

  const level = getLevel(levelId);
  const stationMap = level ? getStationMap(level.mapId) : undefined;

  const handleLocationClick = (locationId: string) => {
    setSelectedLocation(locationId);
    onLocationClick?.(locationId);
  };

  const getGateColor = (status: string, isFaulty: boolean) => {
    if (isFaulty) return '#E53935';
    switch (status) {
      case 'normal':
        return '#43A047';
      case 'restricted':
        return '#FFB800';
      case 'closed':
        return '#888899';
      default:
        return '#43A047';
    }
  };

  const getCongestionColor = (level: number) => {
    if (level >= 0.8) return '#E53935';
    if (level >= 0.6) return '#FFB800';
    if (level >= 0.4) return '#FB8C00';
    return '#43A047';
  };

  const diversionLines = useMemo(() => {
    return diversionRoutes.map((route) => {
      const gate = gates.find((g) => g.id === route.fromGateId);
      const exit = exits.find((e) => e.id === route.toExitId);
      if (!gate || !exit) return null;

      const startX = gate.position.x + gate.width / 2;
      const startY = gate.position.y + gate.height;
      const endX = exit.position.x + exit.width / 2;
      const endY = exit.position.y;

      const midY = (startY + endY) / 2;

      return (
        <g key={`diversion-${route.fromGateId}`}>
          <path
            d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
            stroke="#1E88E5"
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
            opacity="0.8"
          />
          <polygon
            points={`${endX},${endY - 8} ${endX - 6},${endY - 2} ${endX + 6},${endY - 2}`}
            fill="#1E88E5"
          />
        </g>
      );
    });
  }, [diversionRoutes, gates, exits]);

  if (!stationMap) {
    return (
      <div className="flex items-center justify-center h-full text-metro-textMuted">
        加载地图中...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full scanline-overflow overflow-hidden rounded-lg border border-metro-border">
      <svg
        viewBox={`0 0 ${stationMap.width} ${stationMap.height}`}
        className="w-full h-full bg-metro-bgDark grid-bg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern
            id="lockdownPattern"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
          >
            <rect width="10" height="10" fill="rgba(229, 57, 53, 0.2)" />
            <line
              x1="0"
              y1="0"
              x2="10"
              y2="10"
              stroke="rgba(229, 57, 53, 0.5)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {stationMap.walls.map((wall, idx) => (
          <rect
            key={`wall-${idx}`}
            x={wall.x}
            y={wall.y}
            width={wall.width}
            height={wall.height}
            fill="#33334D"
            rx="2"
          />
        ))}

        {stationMap.entrances.map((entrance) => (
          <g key={entrance.id}>
            <rect
              x={entrance.x - 40}
              y={entrance.y - 15}
              width="80"
              height="30"
              fill="none"
              stroke="#888899"
              strokeWidth="2"
              strokeDasharray="5,3"
              rx="4"
            />
            <text
              x={entrance.x}
              y={entrance.y + 5}
              textAnchor="middle"
              fill="#888899"
              fontSize="12"
              fontFamily="sans-serif"
            >
              {entrance.name}
            </text>
          </g>
        ))}

        {lockdownAreas.map((area) => (
          <g key={area.id}>
            <rect
              x={area.x}
              y={area.y}
              width={area.width}
              height={area.height}
              fill="url(#lockdownPattern)"
              stroke="#E53935"
              strokeWidth="2"
              rx="4"
            />
            <text
              x={area.x + area.width / 2}
              y={area.y + 20}
              textAnchor="middle"
              fill="#E53935"
              fontSize="11"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              封控区
            </text>
          </g>
        ))}

        {diversionLines}

        {gates.map((gate) => {
          const isSelected =
            selectedLocationId === gate.id || highlightLocationId === gate.id;
          const color = getGateColor(gate.status, gate.isFaulty);

          return (
            <g
              key={gate.id}
              onClick={() => handleLocationClick(gate.id)}
              className="cursor-pointer"
              style={{ transition: 'all 0.2s ease' }}
            >
              {isSelected && (
                <rect
                  x={gate.position.x - 4}
                  y={gate.position.y - 4}
                  width={gate.width + 8}
                  height={gate.height + 8}
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  rx="6"
                  filter="url(#glow)"
                />
              )}
              <rect
                x={gate.position.x}
                y={gate.position.y}
                width={gate.width}
                height={gate.height}
                fill={color}
                rx="4"
                opacity={gate.status === 'closed' ? 0.5 : 1}
                filter={gate.isFaulty ? 'url(#glow)' : undefined}
              />
              {gate.isFaulty && (
                <rect
                  x={gate.position.x}
                  y={gate.position.y}
                  width={gate.width}
                  height={gate.height}
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="2"
                  rx="4"
                  className="animate-blink"
                />
              )}
              <text
                x={gate.position.x + gate.width / 2}
                y={gate.position.y + gate.height / 2 + 4}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {gate.name.replace('号闸机', '')}
              </text>
            </g>
          );
        })}

        {exits.map((exit) => {
          const isSelected =
            selectedLocationId === exit.id || highlightLocationId === exit.id;
          const congestionColor = getCongestionColor(exit.congestionLevel);

          return (
            <g
              key={exit.id}
              onClick={() => handleLocationClick(exit.id)}
              className="cursor-pointer"
            >
              {isSelected && (
                <rect
                  x={exit.position.x - 4}
                  y={exit.position.y - 4}
                  width={exit.width + 8}
                  height={exit.height + 8}
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  rx="6"
                  filter="url(#glow)"
                />
              )}
              <rect
                x={exit.position.x}
                y={exit.position.y}
                width={exit.width}
                height={exit.height}
                fill="#252540"
                stroke={congestionColor}
                strokeWidth="3"
                rx="4"
              />
              <text
                x={exit.position.x + exit.width / 2}
                y={exit.position.y + exit.height / 2 - 5}
                textAnchor="middle"
                fill="#E0E0E0"
                fontSize="12"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {exit.name}
              </text>
              <text
                x={exit.position.x + exit.width / 2}
                y={exit.position.y + exit.height / 2 + 10}
                textAnchor="middle"
                fill={congestionColor}
                fontSize="10"
                fontFamily="sans-serif"
              >
                {Math.round(exit.congestionLevel * 100)}%
              </text>
              {exit.congestionLevel > 0.6 && (
                <circle
                  cx={exit.position.x + exit.width - 8}
                  cy={exit.position.y + 8}
                  r="5"
                  fill={congestionColor}
                  className="animate-pulse-fast"
                />
              )}
            </g>
          );
        })}

        {passengers
          .filter((p) => p.status !== 'exited')
          .map((passenger) => (
            <circle
              key={passenger.id}
              cx={passenger.position.x}
              cy={passenger.position.y}
              r="4"
              fill={passenger.color}
              opacity={passenger.status === 'stuck' ? 0.5 : 1}
            >
              {passenger.status === 'stuck' && (
                <animate
                  attributeName="r"
                  values="4;6;4"
                  dur="1s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}

        {activeRipple && (
          <circle
            cx={activeRipple.x}
            cy={activeRipple.y}
            r="10"
            fill="none"
            stroke="#1E88E5"
            strokeWidth="3"
            className="ripple-effect"
          />
        )}

        <g transform="translate(600, 70)">
          <rect
            x="0"
            y="0"
            width="130"
            height="100"
            fill="rgba(26, 26, 46, 0.9)"
            stroke="#33334D"
            strokeWidth="1"
            rx="4"
          />
          <text x="10" y="20" fill="#E0E0E0" fontSize="11" fontWeight="bold">
            图例
          </text>
          <circle cx="15" cy="38" r="5" fill="#43A047" />
          <text x="28" y="42" fill="#888899" fontSize="10">
            正常闸机
          </text>
          <circle cx="15" cy="56" r="5" fill="#E53935" />
          <text x="28" y="60" fill="#888899" fontSize="10">
            故障闸机
          </text>
          <circle cx="15" cy="74" r="5" fill="#FFB800" />
          <text x="28" y="78" fill="#888899" fontSize="10">
            限流闸机
          </text>
          <circle cx="15" cy="92" r="3" fill="#4FC3F7" />
          <text x="28" y="96" fill="#888899" fontSize="10">
            乘客
          </text>
        </g>
      </svg>
    </div>
  );
};
