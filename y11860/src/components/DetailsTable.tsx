import React, { useState, useMemo } from 'react';
import {
  Table,
  AlertTriangle,
  Zap,
  AlertCircle,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  Search,
  Maximize2,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { SamplePoint, ConflictSource } from '@/types';
import {
  statusColors,
  statusLabels,
  conflictTypeColors,
  conflictTypeLabels,
  diffColors,
} from '@/utils/colorMap';
import { radToDeg } from '@/utils/kinematics';

interface DetailsTableProps {
  filteredPoints: SamplePoint[];
}

type SortField = 'id' | 'status' | 'manipulability' | 'distance' | 'jointAngle';
type SortDirection = 'asc' | 'desc';

export const DetailsTable: React.FC<DetailsTableProps> = ({ filteredPoints }) => {
  const {
    selectedPointId,
    hoveredPointId,
    setSelectedPoint,
    setHoveredPoint,
    showDiff,
    diffResult,
    getPointById,
  } = useWorkspaceStore();

  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredPoints = useMemo(() => {
    let points = [...filteredPoints];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      points = points.filter(
        (p) =>
          p.id.toLowerCase().includes(term) ||
          p.cartesianPosition.some((v) => v.toFixed(2).includes(term)) ||
          p.conflictSources.some((cs) => cs.details.toLowerCase().includes(term))
      );
    }

    points.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'manipulability':
          comparison = a.manipulability - b.manipulability;
          break;
        case 'distance':
          comparison = a.distanceToObstacle - b.distanceToObstacle;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return points;
  }, [filteredPoints, sortField, sortDirection, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getDiffStatus = (pointId: string) => {
    if (!showDiff || !diffResult) return null;
    if (diffResult.added.includes(pointId)) return 'added';
    if (diffResult.removed.includes(pointId)) return 'removed';
    if (diffResult.changed.includes(pointId)) return 'changed';
    return null;
  };

  const getConflictIcon = (type: ConflictSource['type']) => {
    switch (type) {
      case 'joint_limit':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'collision':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'singularity':
        return <Zap className="w-3.5 h-3.5" />;
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5" />
    );
  };

  const getStatusIcon = (status: SamplePoint['status']) => {
    switch (status) {
      case 'reachable':
        return <CheckCircle className="w-4 h-4" style={{ color: statusColors.reachable }} />;
      case 'collision':
        return <AlertCircle className="w-4 h-4" style={{ color: statusColors.collision }} />;
      case 'singularity':
        return <Zap className="w-4 h-4" style={{ color: statusColors.singularity }} />;
      case 'joint_limit':
        return <AlertTriangle className="w-4 h-4" style={{ color: statusColors.joint_limit }} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-space-panel border border-space-border rounded-lg backdrop-blur-md overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-space-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-neon-cyan" />
            <h2 className="font-display text-lg text-neon-cyan">采样点明细</h2>
            <span className="text-xs text-gray-400 font-mono">
              ({sortedAndFilteredPoints.length} / {filteredPoints.length})
            </span>
          </div>
          {selectedPointId && (
            <button
              onClick={() => setSelectedPoint(null)}
              className="flex items-center gap-1 text-xs text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              取消选中
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索ID、坐标、冲突信息..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-space-bg border border-space-border rounded text-sm text-gray-200 placeholder-gray-500 focus:border-neon-cyan focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-space-panel z-10">
            <tr className="text-left text-xs text-gray-400 border-b border-space-border">
              <th className="px-3 py-2 font-medium">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  ID
                  <SortIcon field="id" />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  状态
                  <SortIcon field="status" />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">关节角 (°)</th>
              <th className="px-3 py-2 font-medium">末端坐标 (m)</th>
              <th className="px-3 py-2 font-medium">
                <button
                  onClick={() => handleSort('manipulability')}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  可操纵度
                  <SortIcon field="manipulability" />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">
                <button
                  onClick={() => handleSort('distance')}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  障碍距离
                  <SortIcon field="distance" />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">冲突来源</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredPoints.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {filteredPoints.length === 0
                    ? '请先点击"运行分析"生成工作空间数据'
                    : '没有匹配的采样点'}
                </td>
              </tr>
            ) : (
              sortedAndFilteredPoints.map((point, index) => {
                const diffStatus = getDiffStatus(point.id);
                const isSelected = selectedPointId === point.id;
                const isHovered = hoveredPointId === point.id;

                let rowBg = 'bg-transparent';
                if (diffStatus === 'added') rowBg = 'bg-diff-added/10';
                else if (diffStatus === 'removed') rowBg = 'bg-diff-removed/10';
                else if (diffStatus === 'changed') rowBg = 'bg-diff-changed/10';
                if (isSelected) rowBg = 'bg-neon-cyan/10';
                if (isHovered && !isSelected) rowBg = 'bg-white/5';

                let rowBorder = '';
                if (diffStatus === 'added') rowBorder = 'border-l-2 border-diff-added';
                else if (diffStatus === 'removed') rowBorder = 'border-l-2 border-diff-removed';
                else if (diffStatus === 'changed') rowBorder = 'border-l-2 border-diff-changed';

                return (
                  <tr
                    key={point.id}
                    className={`${rowBg} ${rowBorder} border-b border-space-border/30 cursor-pointer transition-colors hover:bg-white/5`}
                    onClick={() => setSelectedPoint(isSelected ? null : point.id)}
                    onMouseEnter={() => setHoveredPoint(point.id)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-300">
                      {diffStatus && (
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: diffColors[diffStatus] }}
                        />
                      )}
                      {point.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(point.status)}
                        <span
                          className="text-xs font-medium"
                          style={{ color: statusColors[point.status] }}
                        >
                          {statusLabels[point.status]}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {point.jointAngles.slice(0, 3).map((angle, i) => (
                          <span
                            key={i}
                            className={`px-1 rounded ${
                              point.conflictSources.some(
                                (cs) => cs.type === 'joint_limit' && cs.jointIndex === i
                              )
                                ? 'bg-warning-orange/20 text-warning-orange'
                                : 'bg-space-bg/50'
                            }`}
                          >
                            {radToDeg(angle).toFixed(0)}°
                          </span>
                        ))}
                        {point.jointAngles.length > 3 && (
                          <span className="text-gray-500">...</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">
                      [{point.cartesianPosition.map((v) => v.toFixed(2)).join(', ')}]
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span
                        className={
                          point.manipulability < 0.01 ? 'text-singularity-purple' : 'text-gray-400'
                        }
                      >
                        {point.manipulability.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span
                        className={
                          point.distanceToObstacle < 0.1
                            ? 'text-error-red'
                            : point.distanceToObstacle < 0.2
                            ? 'text-warning-orange'
                            : 'text-gray-400'
                        }
                      >
                        {point.distanceToObstacle.toFixed(3)}m
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {point.conflictSources.length === 0 ? (
                        <span className="text-xs text-gray-500">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {point.conflictSources.map((cs, csIndex) => (
                            <div
                              key={csIndex}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${conflictTypeColors[cs.type]}15`,
                                color: conflictTypeColors[cs.type],
                              }}
                              title={cs.details}
                            >
                              {getConflictIcon(cs.type)}
                              <span className="font-medium">
                                {cs.jointIndex !== undefined
                                  ? `J${cs.jointIndex + 1}`
                                  : conflictTypeLabels[cs.type]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedPointId && (
        <SelectedPointDetails pointId={selectedPointId} />
      )}
    </div>
  );
};

interface SelectedPointDetailsProps {
  pointId: string;
}

const SelectedPointDetails: React.FC<SelectedPointDetailsProps> = ({ pointId }) => {
  const { getPointById } = useWorkspaceStore();
  const point = getPointById(pointId);

  if (!point) return null;

  return (
    <div className="border-t border-space-border p-4 bg-space-bg/50">
      <h3 className="font-display text-sm text-neon-cyan mb-3">选中点详情</h3>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-400">ID:</span>
          <span className="font-mono text-gray-200 ml-2">{point.id}</span>
        </div>
        <div>
          <span className="text-gray-400">状态:</span>
          <span className="ml-2" style={{ color: statusColors[point.status] }}>
            {statusLabels[point.status]}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">关节角:</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {point.jointAngles.map((angle, i) => {
              const hasConflict = point.conflictSources.some(
                (cs) => cs.type === 'joint_limit' && cs.jointIndex === i
              );
              return (
                <div
                  key={i}
                  className={`font-mono px-2 py-1 rounded ${
                    hasConflict
                      ? 'bg-warning-orange/20 text-warning-orange border border-warning-orange/50'
                      : 'bg-space-bg text-gray-300'
                  }`}
                >
                  J{i + 1}: {radToDeg(angle).toFixed(2)}°
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">末端位置:</span>
          <span className="font-mono text-gray-200 ml-2">
            [{point.cartesianPosition.map((v) => v.toFixed(4)).join(', ')}]
          </span>
        </div>
        <div>
          <span className="text-gray-400">可操纵度:</span>
          <span className="font-mono text-gray-200 ml-2">{point.manipulability.toFixed(6)}</span>
        </div>
        <div>
          <span className="text-gray-400">障碍距离:</span>
          <span className="font-mono text-gray-200 ml-2">
            {point.distanceToObstacle.toFixed(4)}m
          </span>
        </div>
        {point.conflictSources.length > 0 && (
          <div className="col-span-2">
            <span className="text-gray-400">冲突详情:</span>
            <div className="space-y-1 mt-1">
              {point.conflictSources.map((cs, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded"
                  style={{ backgroundColor: `${conflictTypeColors[cs.type]}10` }}
                >
                  <span
                    className="mt-0.5"
                    style={{ color: conflictTypeColors[cs.type] }}
                  >
                    {cs.type === 'joint_limit' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {cs.type === 'collision' && <AlertCircle className="w-3.5 h-3.5" />}
                    {cs.type === 'singularity' && <Zap className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <div
                      className="font-medium text-xs"
                      style={{ color: conflictTypeColors[cs.type] }}
                    >
                      {conflictTypeLabels[cs.type]}
                      {cs.jointIndex !== undefined && ` (关节 ${cs.jointIndex + 1})`}
                    </div>
                    <div className="text-xs text-gray-400">{cs.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
