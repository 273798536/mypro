import React, { useState } from 'react';
import { MapPoint, MapZone } from '../types/task';
import { DATA_STATUS_COLORS } from '../utils/color';
import { DataStatus } from '../types/common';

interface FarmMapProps {
  points: MapPoint[];
  zones: MapZone[];
  onPointClick?: (point: MapPoint) => void;
  selectedPointId?: string;
}

export const FarmMap: React.FC<FarmMapProps> = ({ points, zones, onPointClick, selectedPointId }) => {
  const [hoveredPoint, setHoveredPoint] = useState<MapPoint | null>(null);

  const getPointColor = (point: MapPoint): string => {
    if (point.worstStatus) {
      return DATA_STATUS_COLORS[point.worstStatus];
    }
    if (point.riskLevel !== undefined) {
      const colorMap: Record<number, string> = {
        0: '#2DD4BF',
        1: '#60A5FA',
        2: '#FBBF24',
        3: '#F97316',
        4: '#EF4444',
      };
      return colorMap[point.riskLevel] || '#CBD5E1';
    }
    return '#94A3B8';
  };

  const getZoneColor = (zone: MapZone): string => {
    const colorMap: Record<string, string> = {
      '近岸养殖区': '#60A5FA33',
      '深水养殖区': '#2DD4BF33',
      '进水渠道': '#F59E0B33',
    };
    return colorMap[zone.name] || '#CBD5E133';
  };

  const getZoneBorder = (zone: MapZone): string => {
    const colorMap: Record<string, string> = {
      '近岸养殖区': '#60A5FA',
      '深水养殖区': '#2DD4BF',
      '进水渠道': '#F59E0B',
    };
    return colorMap[zone.name] || '#CBD5E1';
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-ocean-50 via-slate-50 to-cyan-50 rounded-lg overflow-hidden">
      <svg
        viewBox="0 0 600 400"
        className="w-full h-full"
        style={{ maxHeight: '500px' }}
      >
        <defs>
          <pattern id="water" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 20 Q10 15, 20 20 T40 20" fill="none" stroke="#E0F2FE" strokeWidth="1" opacity="0.5" />
            <path d="M0 30 Q10 25, 20 30 T40 30" fill="none" stroke="#E0F2FE" strokeWidth="1" opacity="0.3" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="600" height="400" fill="url(#water)" />

        {zones.map((zone) => (
          <g key={zone.id}>
            {zone.coordinates && (
              <rect
                x={zone.coordinates.x}
                y={zone.coordinates.y}
                width={zone.coordinates.width}
                height={zone.coordinates.height}
                fill={getZoneColor(zone)}
                stroke={getZoneBorder(zone)}
                strokeWidth="2"
                strokeDasharray="6,4"
                rx="8"
              />
            )}
            {zone.labelPosition && (
              <text
                x={zone.labelPosition.x}
                y={zone.labelPosition.y}
                textAnchor="middle"
                className="text-xs fill-slate-600 font-medium"
              >
                {zone.name}
              </text>
            )}
          </g>
        ))}

        <rect x="10" y="340" width="80" height="50" fill="#D97706" rx="4" opacity="0.8" />
        <text x="50" y="370" textAnchor="middle" className="text-xs fill-white font-medium">
          泵房
        </text>

        <line x1="50" y1="340" x2="80" y2="300" stroke="#D97706" strokeWidth="3" strokeDasharray="4,2" />
        <text x="60" y="320" textAnchor="middle" className="text-[10px] fill-amber-700">
          进水
        </text>

        <line x1="550" y1="340" x2="520" y2="300" stroke="#DC2626" strokeWidth="3" strokeDasharray="4,2" />
        <text x="540" y="320" textAnchor="middle" className="text-[10px] fill-red-600">
          排水
        </text>

        {points.map((point) => {
          const isSelected = selectedPointId === point.id;
          const isHovered = hoveredPoint?.id === point.id;
          const color = getPointColor(point);

          return (
            <g
              key={point.id}
              onClick={() => onPointClick && onPointClick(point)}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              {(isSelected || isHovered) && (
                <>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    opacity="0.4"
                    className="animate-pulse-ring"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="24"
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.2"
                    className="animate-pulse-ring"
                    style={{ animationDelay: '0.5s' }}
                  />
                </>
              )}

              <circle
                cx={point.x}
                cy={point.y}
                r={isSelected || isHovered ? 12 : 10}
                fill={color}
                stroke="white"
                strokeWidth="3"
                filter={isSelected || isHovered ? 'url(#glow)' : undefined}
                className="transition-all duration-200"
              />

              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                className="text-xs font-bold fill-white pointer-events-none"
              >
                {point.id}
              </text>

              {(isSelected || isHovered) && point.dataQuality != null && (
                <g>
                  <rect
                    x={point.x - 35}
                    y={point.y - 48}
                    width="70"
                    height="22"
                    rx="4"
                    fill="white"
                    stroke={color}
                    strokeWidth="1"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                  />
                  <text
                    x={point.x}
                    y={point.y - 33}
                    textAnchor="middle"
                    className="text-[11px] font-mono fill-slate-700"
                  >
                    质量 {point.dataQuality}/100
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {hoveredPoint && (
        <div className="absolute top-4 right-4 bg-white rounded-lg p-4 shadow-xl border border-slate-200 w-64 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getPointColor(hoveredPoint) }} />
              点位 {hoveredPoint.id}
            </h4>
            {hoveredPoint.worstStatus && (
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${DATA_STATUS_COLORS[hoveredPoint.worstStatus]}20`, color: DATA_STATUS_COLORS[hoveredPoint.worstStatus] }}>
                {hoveredPoint.worstStatus === DataStatus.AVAILABLE ? '可用' :
                 hoveredPoint.worstStatus === DataStatus.PENDING ? '暂缓' :
                 hoveredPoint.worstStatus === DataStatus.NEED_REVIEW ? '需复核' : '需重采'}
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">所属区域</span>
              <span className="text-slate-700">{hoveredPoint.zone}</span>
            </div>
            {hoveredPoint.salinity != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">盐度</span>
                <span className="text-slate-700 font-mono">{hoveredPoint.salinity} PSU</span>
              </div>
            )}
            {hoveredPoint.dissolvedOxygen != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">溶解氧</span>
                <span className="text-slate-700 font-mono">{hoveredPoint.dissolvedOxygen} mg/L</span>
              </div>
            )}
            {hoveredPoint.ph != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">pH</span>
                <span className="text-slate-700 font-mono">{hoveredPoint.ph}</span>
              </div>
            )}
            {hoveredPoint.dataQuality != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">数据质量</span>
                <span className="font-mono font-medium" style={{ color: hoveredPoint.dataQuality >= 80 ? '#2DD4BF' : hoveredPoint.dataQuality >= 60 ? '#F59E0B' : '#EF4444' }}>
                  {hoveredPoint.dataQuality}/100
                </span>
              </div>
            )}
          </div>

          {hoveredPoint.description && (
            <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              {hoveredPoint.description}
            </p>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 border border-slate-200">
        <p className="text-xs font-medium text-slate-600 mb-2">图例</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-status-available" />
            <span className="text-slate-600">正常可用</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-status-pending" />
            <span className="text-slate-600">暂缓使用</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-status-review" />
            <span className="text-slate-600">需场长复核</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-status-recollect" />
            <span className="text-slate-600">建议重新采集</span>
          </div>
        </div>
      </div>
    </div>
  );
};
