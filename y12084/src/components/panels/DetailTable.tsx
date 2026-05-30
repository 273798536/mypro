import { useAppStore, useFilteredBuildings, useBuildingConflicts } from '@/store/useAppStore';
import { Building } from '@/types';
import { getBuildingStatusLabel, getSeverityColor } from '@/utils/collision';
import { Building2, MapPin, Ruler, AlertTriangle, Layers } from 'lucide-react';
import { useState } from 'react';

interface BuildingRowProps {
  building: Building;
  isSelected: boolean;
  onClick: () => void;
}

function BuildingRow({ building, isSelected, onClick }: BuildingRowProps) {
  const conflicts = useBuildingConflicts(building.id);
  const unresolvedConflicts = conflicts.filter(c => !c.resolved);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'proposed': return 'bg-blue-500';
      case 'existing': return 'bg-gray-500';
      case 'under-construction': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };

  const highestSeverity = unresolvedConflicts.length > 0
    ? ['critical', 'error', 'warning'].find(s => unresolvedConflicts.some(c => c.severity === s))
    : null;

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'bg-cyan-500/20 border-l-2 border-cyan-400'
          : 'hover:bg-slate-800/50 border-l-2 border-transparent'
      }`}
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(building.status)}`} />
          <span className="text-sm text-white font-medium">{building.name}</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-400">{building.plotId}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-300">{building.height}m</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-400">{getBuildingStatusLabel(building.status)}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-400">{building.function}</span>
      </td>
      <td className="px-3 py-2">
        {unresolvedConflicts.length > 0 ? (
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} style={{ color: getSeverityColor(highestSeverity || 'warning') }} />
            <span
              className="text-xs font-medium"
              style={{ color: getSeverityColor(highestSeverity || 'warning') }}
            >
              {unresolvedConflicts.length}
            </span>
          </div>
        ) : (
          <span className="text-xs text-green-500">✓</span>
        )}
      </td>
    </tr>
  );
}

export default function DetailTable() {
  const buildings = useFilteredBuildings();
  const selectedBuildingId = useAppStore(state => state.selectedBuildingId);
  const { selectBuilding } = useAppStore(state => state.actions);
  const [sortBy, setSortBy] = useState<'name' | 'height' | 'conflicts'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sortedBuildings = [...buildings].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'height':
        comparison = a.height - b.height;
        break;
      case 'conflicts':
        const aConflicts = useAppStore.getState().conflicts.filter(c => c.buildingIds.includes(a.id) && !c.resolved).length;
        const bConflicts = useAppStore.getState().conflicts.filter(c => c.buildingIds.includes(b.id) && !c.resolved).length;
        comparison = aConflicts - bConflicts;
        break;
    }
    return sortAsc ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-cyan-400" />
            <span className="text-sm font-medium text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              建筑明细
            </span>
            <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
              {sortedBuildings.length} 项
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-slate-700">
              <th
                className="px-3 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  名称
                  {sortBy === 'name' && <span>{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-3 py-2 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  地块
                </div>
              </th>
              <th
                className="px-3 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('height')}
              >
                <div className="flex items-center gap-1">
                  <Ruler size={12} />
                  高度
                  {sortBy === 'height' && <span>{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>
              <th className="px-3 py-2 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-1">
                  <Layers size={12} />
                  状态
                </div>
              </th>
              <th className="px-3 py-2 text-xs font-medium text-slate-400">功能</th>
              <th
                className="px-3 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-white"
                onClick={() => handleSort('conflicts')}
              >
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} />
                  冲突
                  {sortBy === 'conflicts' && <span>{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedBuildings.map(building => (
              <BuildingRow
                key={building.id}
                building={building}
                isSelected={selectedBuildingId === building.id}
                onClick={() => selectBuilding(selectedBuildingId === building.id ? null : building.id)}
              />
            ))}
          </tbody>
        </table>

        {sortedBuildings.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Building2 size={48} className="mb-2 opacity-30" />
            <p className="text-sm">没有匹配的建筑</p>
            <p className="text-xs">请调整筛选条件</p>
          </div>
        )}
      </div>
    </div>
  );
}
