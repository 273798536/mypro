import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { getZoneColor } from '@/utils/graphUtils';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';

interface BuildingTopologyProps {
  compact?: boolean;
}

export default function BuildingTopology({ compact = false }: BuildingTopologyProps) {
  const { buildings, routeEdges, anomalies, selectedBuildingId, setSelectedBuildingId } = useStore();
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  const scale = compact ? 0.7 : 1;
  const offsetX = compact ? 50 : 0;
  const offsetY = compact ? 30 : 0;

  const getBuildingAnomalies = (buildingId: string) => {
    return anomalies.filter(
      a => !a.resolved && a.sourceIds.includes(buildingId)
    );
  };

  const getEdgeAnomalies = (edgeId: string) => {
    return anomalies.filter(
      a => !a.resolved && a.type === 'route_break' && a.sourceIds.includes(edgeId)
    );
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  return (
    <div className="relative">
      <svg
        width={compact ? 700 : 950}
        height={compact ? 350 : 480}
        viewBox={`0 0 950 480`}
        className="w-full h-auto"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
          <linearGradient id="inactiveEdge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {routeEdges.map((edge) => {
          const from = buildings.find(b => b.id === edge.fromBuilding);
          const to = buildings.find(b => b.id === edge.toBuilding);
          if (!from || !to) return null;

          const edgeAnomalies = getEdgeAnomalies(edge.id);
          const hasBreakpoint = edgeAnomalies.length > 0;

          const x1 = from.x * scale + offsetX;
          const y1 = from.y * scale + offsetY;
          const x2 = to.x * scale + offsetX;
          const y2 = to.y * scale + offsetY;

          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={hasBreakpoint ? '#ea580c' : edge.isActive ? '#94a3b8' : 'url(#inactiveEdge)'}
                strokeWidth={hasBreakpoint ? 3 : 2}
                strokeDasharray={hasBreakpoint ? '8,4' : edge.isActive ? 'none' : '4,4'}
              />
              {hasBreakpoint && (
                <g>
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r={10}
                    fill="#ea580c"
                    className="animate-pulse"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 4}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {buildings.map((building) => {
          const buildingAnomalies = getBuildingAnomalies(building.id);
          const hasAccessClosed = buildingAnomalies.some(a => a.type === 'access_closed');
          const isSelected = selectedBuildingId === building.id;
          const isHovered = hoveredBuilding === building.id;
          const zoneColor = getZoneColor(building.zone);

          const cx = building.x * scale + offsetX;
          const cy = building.y * scale + offsetY;
          const radius = compact ? 22 : 28;

          return (
            <g
              key={building.id}
              className="cursor-pointer"
              onClick={() => setSelectedBuildingId(isSelected ? null : building.id)}
              onMouseEnter={() => setHoveredBuilding(building.id)}
              onMouseLeave={() => setHoveredBuilding(null)}
            >
              <circle
                cx={cx}
                cy={cy}
                r={radius + (isSelected || isHovered ? 4 : 0)}
                fill={isSelected ? '#3b82f6' : 'transparent'}
                className="transition-all duration-200"
              />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={hasAccessClosed ? '#dc2626' : building.accessOpen ? zoneColor : '#94a3b8'}
                stroke={isSelected ? '#1d4ed8' : 'white'}
                strokeWidth={3}
                filter="url(#shadow)"
                className="transition-all duration-200"
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fill="white"
                fontSize={compact ? 11 : 13}
                fontWeight="bold"
              >
                {building.name.replace(/号楼|物业中心/g, '')}
              </text>
              {!building.accessOpen && (
                <g>
                  <circle
                    cx={cx + radius - 5}
                    cy={cy - radius + 5}
                    r={10}
                    fill="#dc2626"
                    stroke="white"
                    strokeWidth={2}
                  />
                  <Lock
                    x={cx + radius - 13}
                    y={cy - radius - 3}
                    size={16}
                    fill="white"
                    color="white"
                  />
                </g>
              )}
              <text
                x={cx}
                y={cy + radius + 16}
                textAnchor="middle"
                fill="#475569"
                fontSize={compact ? 10 : 12}
                fontWeight="medium"
              >
                {building.name}
              </text>
              <text
                x={cx}
                y={cy + radius + 30}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={compact ? 8 : 10}
              >
                {building.zone}区 · {building.floor}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600">A区</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600">B区</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-600">C区</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-violet-500" />
          <span className="text-xs text-slate-600">D区</span>
        </div>
        <div className="h-4 w-px bg-slate-300" />
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" />
          <span className="text-xs text-slate-600">门禁正常</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-red-500" />
          <span className="text-xs text-slate-600">门禁关闭</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" />
          <span className="text-xs text-slate-600">路线断点</span>
        </div>
      </div>

      {selectedBuilding && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">{selectedBuilding.name}</h3>
            <button
              onClick={() => setSelectedBuildingId(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">区域</span>
              <span className="text-slate-700">{selectedBuilding.zone}区</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">楼层</span>
              <span className="text-slate-700">{selectedBuilding.floor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">门禁状态</span>
              <span className={cn(
                selectedBuilding.accessOpen ? 'text-emerald-600' : 'text-red-600'
              )}>
                {selectedBuilding.accessOpen ? '正常开启' : '已关闭'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">巡检频次</span>
              <span className="text-slate-700">{selectedBuilding.inspectionFrequency}次/天</span>
            </div>
          </div>
          {getBuildingAnomalies(selectedBuilding.id).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="text-xs font-medium text-red-600 mb-2">关联异常</div>
              {getBuildingAnomalies(selectedBuilding.id).map(a => (
                <div key={a.id} className="text-xs text-slate-600 bg-red-50 px-2 py-1 rounded mb-1">
                  {a.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
