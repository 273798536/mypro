import { useMemo, useState, useCallback } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { useDataStore } from '@/store/useDataStore';
import { useSceneStore } from '@/store/useSceneStore';
import { getFrequencyColor, getFrequencyName, getIssueTypeName } from '@/engine/acoustics';
import type { Seat, FrequencyBand, IssueType } from '@/types/acoustics';
import { Table2, AlertTriangle, Eye, Filter, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'row' | 'col' | 'rt60' | 'spl' | 'c80';
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: string;
  label: string;
  sortField?: SortField;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export const SeatsDetail = () => {
  const { seats, activeFrequencyBand, filters } = useDataStore();
  const { selectedSeatId, setSelectedSeatId } = useSceneStore();
  const [sortField, setSortField] = useState<SortField>('row');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredSeats = useMemo(() => {
    let result = [...seats];

    if (filters.showOnlyIssues) {
      result = result.filter((seat) => seat.issues.length > 0);
    }

    if (filters.issueTypes.length > 0) {
      result = result.filter((seat) =>
        seat.issues.some((issue) => filters.issueTypes.includes(issue))
      );
    }

    if (filters.selectedSeatIds.length > 0) {
      result = result.filter((seat) => filters.selectedSeatIds.includes(seat.id));
    }

    return result;
  }, [seats, filters]);

  const sortedSeats = useMemo(() => {
    return [...filteredSeats].sort((a, b) => {
      let aVal: number | null = null;
      let bVal: number | null = null;

      if (sortField === 'row' || sortField === 'col') {
        aVal = a[sortField];
        bVal = b[sortField];
      } else {
        aVal = a.acoustics[activeFrequencyBand][sortField];
        bVal = b.acoustics[activeFrequencyBand][sortField];
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      const diff = (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [filteredSeats, sortField, sortDirection, activeFrequencyBand]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const columns: ColumnConfig[] = [
    { key: 'seat', label: '座位', width: '70px' },
    { key: 'rt60', label: 'RT60(s)', sortField: 'rt60', width: '70px', align: 'right' },
    { key: 'spl', label: 'SPL(dB)', sortField: 'spl', width: '70px', align: 'right' },
    { key: 'c80', label: 'C80(dB)', sortField: 'c80', width: '70px', align: 'right' },
    { key: 'issues', label: '问题', width: '80px', align: 'center' },
  ];

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-zinc-600" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  };

  return (
    <Panel title="座位明细" icon={<Table2 size={14} />} className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            共 <span className="text-zinc-200 font-mono">{sortedSeats.length}</span> / {seats.length} 个座位
          </span>
          <div className="flex items-center gap-2">
            {(['low', 'mid', 'high'] as FrequencyBand[]).map((band) => (
              <span
                key={band}
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: activeFrequencyBand === band ? getFrequencyColor(band) : '#52525b',
                  opacity: activeFrequencyBand === band ? 1 : 0.3,
                }}
                title={getFrequencyName(band)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 text-zinc-400 font-medium border-b border-zinc-800 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={{ width: col.width }}
                >
                  {col.sortField ? (
                    <button
                      onClick={() => handleSort(col.sortField as SortField)}
                      className="flex items-center gap-1 hover:text-zinc-200 transition-colors w-full justify-end"
                    >
                      {col.label}
                      <SortIcon field={col.sortField} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSeats.map((seat, idx) => {
              const ac = seat.acoustics[activeFrequencyBand];
              const isSelected = selectedSeatId === seat.id;

              return (
                <tr
                  key={seat.id}
                  onClick={() => setSelectedSeatId(isSelected ? null : seat.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${idx % 2 === 0 ? 'bg-zinc-800/20' : 'bg-transparent'}
                    ${isSelected ? 'bg-blue-600/20 hover:bg-blue-600/30' : 'hover:bg-zinc-800/40'}
                    ${seat.issues.length > 0 ? 'border-l-2' : ''}
                  `}
                  style={{
                    borderLeftColor: seat.isOccluded ? '#ef4444' : seat.issues.length > 0 ? '#f59e0b' : 'transparent',
                  }}
                >
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-zinc-200">
                        {seat.row + 1}-{seat.col + 1}
                      </span>
                      {seat.isOccluded && (
                        <Eye size={10} className="text-red-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    <span className={ac.hasError ? 'text-red-400' : 'text-zinc-300'}>
                      {ac.rt60?.toFixed(2) || '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    <span className={ac.hasError ? 'text-red-400' : 'text-zinc-300'}>
                      {ac.spl?.toFixed(1) || '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    <span className={ac.hasError ? 'text-red-400' : 'text-zinc-300'}>
                      {ac.c80?.toFixed(1) || '--'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {seat.issues.length > 0 ? (
                      <div className="flex justify-center gap-0.5">
                        {seat.issues.slice(0, 2).map((issue) => (
                          <Badge
                            key={issue}
                            size="sm"
                            variant={issue === 'seat_occluded' ? 'danger' : 'warning'}
                            className="text-[9px] px-1 py-0"
                          >
                            <AlertTriangle size={8} />
                          </Badge>
                        ))}
                        {seat.issues.length > 2 && (
                          <Badge size="sm" variant="default" className="text-[9px] px-1 py-0">
                            +{seat.issues.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedSeats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Filter size={24} className="mb-2 opacity-50" />
            <span className="text-xs">暂无符合条件的座位</span>
          </div>
        )}
      </div>
    </Panel>
  );
};
