import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useFilterStore } from '../../store/useFilterStore';

export const SeatFilter: React.FC = () => {
  const seats = useDataStore((state) => state.seats);
  const { seatFilter, setSectionFilter, setRowFilter, setSeatNumberFilter } =
    useFilterStore();

  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [rowExpanded, setRowExpanded] = useState(true);
  const [seatExpanded, setSeatExpanded] = useState(false);

  const availableSections = useMemo(() => {
    const sections = new Set(seats.map((s) => s.section));
    return Array.from(sections).sort();
  }, [seats]);

  const availableRows = useMemo(() => {
    const rows = new Set(seats.map((s) => s.row));
    return Array.from(rows).sort();
  }, [seats]);

  const availableSeatNumbers = useMemo(() => {
    const numbers = new Set(seats.map((s) => s.number));
    return Array.from(numbers).sort((a, b) => a - b);
  }, [seats]);

  const toggleSection = (section: string) => {
    const current = seatFilter.sections;
    const next = current.includes(section)
      ? current.filter((s) => s !== section)
      : [...current, section];
    setSectionFilter(next);
  };

  const toggleRow = (row: string) => {
    const current = seatFilter.rows;
    const next = current.includes(row)
      ? current.filter((r) => r !== row)
      : [...current, row];
    setRowFilter(next);
  };

  const toggleSeatNumber = (number: number) => {
    const current = seatFilter.seatNumbers;
    const next = current.includes(number)
      ? current.filter((n) => n !== number)
      : [...current, number];
    setSeatNumberFilter(next);
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-sm font-semibold text-slate-200">座位筛选</h3>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSectionExpanded(!sectionExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">区域</span>
          <div className="flex items-center gap-2">
            {seatFilter.sections.length > 0 && (
              <span className="text-xs text-cyan-400">
                {seatFilter.sections.length} 选中
              </span>
            )}
            {sectionExpanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </button>

        {sectionExpanded && (
          <div className="p-3 space-y-1 border-t border-slate-700">
            {availableSections.map((section) => (
              <label
                key={section}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={seatFilter.sections.includes(section)}
                  onChange={() => toggleSection(section)}
                  className="rounded border-slate-600 bg-slate-700 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">{section}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setRowExpanded(!rowExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">排号</span>
          <div className="flex items-center gap-2">
            {seatFilter.rows.length > 0 && (
              <span className="text-xs text-cyan-400">
                {seatFilter.rows.length} 选中
              </span>
            )}
            {rowExpanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </button>

        {rowExpanded && (
          <div className="p-3 border-t border-slate-700">
            <div className="flex flex-wrap gap-1">
              {availableRows.map((row) => (
                <label
                  key={row}
                  className={`cursor-pointer px-2 py-1 rounded text-xs transition-colors ${
                    seatFilter.rows.includes(row)
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={seatFilter.rows.includes(row)}
                    onChange={() => toggleRow(row)}
                    className="hidden"
                  />
                  {row}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSeatExpanded(!seatExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">座号</span>
          <div className="flex items-center gap-2">
            {seatFilter.seatNumbers.length > 0 && (
              <span className="text-xs text-cyan-400">
                {seatFilter.seatNumbers.length} 选中
              </span>
            )}
            {seatExpanded ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </button>

        {seatExpanded && (
          <div className="p-3 border-t border-slate-700">
            <div className="flex flex-wrap gap-1">
              {availableSeatNumbers.map((number) => (
                <label
                  key={number}
                  className={`cursor-pointer px-2 py-1 rounded text-xs transition-colors ${
                    seatFilter.seatNumbers.includes(number)
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={seatFilter.seatNumbers.includes(number)}
                    onChange={() => toggleSeatNumber(number)}
                    className="hidden"
                  />
                  {number}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
