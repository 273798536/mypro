import React, { useMemo, useState } from 'react';
import type { OcclusionResult, OcclusionType } from '../../types/occlusion';
import {
  OCCLUSION_TYPE_LABELS,
  OCCLUSION_TYPE_COLORS,
  OCCLUSION_SEVERITY_LABELS,
} from '../../types/occlusion';
import type { Seat } from '../../types/seat';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'row' | 'number' | 'type' | 'severity';
type SortDirection = 'asc' | 'desc';

interface RecordTableProps {
  results: OcclusionResult[];
  seats: Seat[];
}

export const RecordTable: React.FC<RecordTableProps> = ({ results, seats }) => {
  const selectedSeatId = useDataStore((state) => state.selectedSeatId);
  const setSelectedSeatId = useDataStore((state) => state.setSelectedSeatId);
  const { occlusionFilter, seatFilter, showBadRows } = useFilterStore();

  const [sortField, setSortField] = useState<SortField>('row');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const seatMap = useMemo(() => {
    const map = new Map<string, Seat>();
    seats.forEach((seat) => map.set(seat.id, seat));
    return map;
  }, [seats]);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      if (occlusionFilter.types.length > 0 && !occlusionFilter.types.includes(result.type)) {
        return false;
      }
      if (
        occlusionFilter.severities.length > 0 &&
        !occlusionFilter.severities.includes(result.severity)
      ) {
        return false;
      }
      if (
        occlusionFilter.sources.length > 0 &&
        !occlusionFilter.sources.includes(result.source)
      ) {
        return false;
      }

      const seat = seatMap.get(result.seatId);
      if (seat) {
        if (seatFilter.sections.length > 0 && !seatFilter.sections.includes(seat.section)) {
          return false;
        }
        if (seatFilter.rows.length > 0 && !seatFilter.rows.includes(seat.row)) {
          return false;
        }
        if (
          seatFilter.seatNumbers.length > 0 &&
          !seatFilter.seatNumbers.includes(seat.number)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [results, seatMap, occlusionFilter, seatFilter]);

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const seatA = seatMap.get(a.seatId);
      const seatB = seatMap.get(b.seatId);

      let comparison = 0;

      switch (sortField) {
        case 'row':
          comparison = (seatA?.row || '').localeCompare(seatB?.row || '');
          break;
        case 'number':
          comparison = (seatA?.number || 0) - (seatB?.number || 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'severity': {
          const severityOrder = { error: 0, warning: 1, info: 2 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredResults, seatMap, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (seatId: string) => {
    setSelectedSeatId(selectedSeatId === seatId ? undefined : seatId);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="inline" />
    ) : (
      <ChevronDown size={14} className="inline" />
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-cyan-500/20 text-cyan-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">遮挡记录</h3>
        <span className="text-xs text-slate-400">
          共 {sortedResults.length} 条
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 text-xs">
              <th
                className="p-2 cursor-pointer hover:bg-slate-700/50"
                onClick={() => handleSort('row')}
              >
                排 <SortIcon field="row" />
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-slate-700/50"
                onClick={() => handleSort('number')}
              >
                座 <SortIcon field="number" />
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-slate-700/50"
                onClick={() => handleSort('type')}
              >
                类型 <SortIcon field="type" />
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-slate-700/50"
                onClick={() => handleSort('severity')}
              >
                级别 <SortIcon field="severity" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result) => {
              const seat = seatMap.get(result.seatId);
              const isSelected = selectedSeatId === result.seatId;

              return (
                <tr
                  key={result.id}
                  onClick={() => handleRowClick(result.seatId)}
                  className={`cursor-pointer border-b border-slate-700/50 transition-colors ${
                    isSelected
                      ? 'bg-cyan-900/30 hover:bg-cyan-900/40'
                      : 'hover:bg-slate-700/30'
                  }`}
                >
                  <td className="p-2 text-slate-300 font-medium">
                    {seat?.row || '-'}
                  </td>
                  <td className="p-2 text-slate-300">{seat?.number || '-'}</td>
                  <td className="p-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: OCCLUSION_TYPE_COLORS[result.type] }}
                      />
                      <span className="text-slate-300 text-xs">
                        {OCCLUSION_TYPE_LABELS[result.type]}
                      </span>
                    </span>
                  </td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(
                        result.severity
                      )}`}
                    >
                      {OCCLUSION_SEVERITY_LABELS[result.severity]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedSeatId && (
        <div className="p-3 border-t border-slate-700 bg-slate-800/50">
          <h4 className="text-xs font-semibold text-slate-400 mb-2">详细信息</h4>
          {(() => {
            const seat = seatMap.get(selectedSeatId);
            const result = results.find((r) => r.seatId === selectedSeatId);
            if (!seat || !result) return null;

            return (
              <div className="space-y-1 text-xs text-slate-300">
                <p>
                  <span className="text-slate-500">座位：</span>
                  {seat.section} {seat.row}排{seat.number}座
                </p>
                <p>
                  <span className="text-slate-500">位置：</span>
                  ({seat.position.x.toFixed(2)}, {seat.position.y.toFixed(2)},{' '}
                  {seat.position.z.toFixed(2)})
                </p>
                <p>
                  <span className="text-slate-500">说明：</span>
                  {result.description}
                </p>
                {result.distance !== undefined && (
                  <p>
                    <span className="text-slate-500">距离：</span>
                    {result.distance.toFixed(2)} 米
                  </p>
                )}
                {seat.originalLineNumber && (
                  <p>
                    <span className="text-slate-500">原始行：</span>
                    第 {seat.originalLineNumber} 行
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
