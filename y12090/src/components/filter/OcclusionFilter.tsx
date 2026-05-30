import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useFilterStore } from '../../store/useFilterStore';
import {
  OCCLUSION_TYPE_LABELS,
  OCCLUSION_TYPE_COLORS,
  OCCLUSION_SEVERITY_LABELS,
  OCCLUSION_SOURCE_LABELS,
} from '../../types/occlusion';
import type {
  OcclusionType,
  OcclusionSeverity,
  OcclusionSource,
} from '../../types/occlusion';

export const OcclusionFilter: React.FC = () => {
  const {
    occlusionFilter,
    setOcclusionTypeFilter,
    setOcclusionSeverityFilter,
    setOcclusionSourceFilter,
    setShowSightLines,
    showSightLines,
    showOnlySelected,
    setShowOnlySelected,
  } = useFilterStore();

  const [typeExpanded, setTypeExpanded] = useState(true);
  const [severityExpanded, setSeverityExpanded] = useState(true);
  const [sourceExpanded, setSourceExpanded] = useState(true);

  const allTypes: OcclusionType[] = [
    'normal',
    'subtitle_screen',
    'obstacle',
    'wall_penetration',
    'screen_height_error',
  ];

  const allSeverities: OcclusionSeverity[] = ['info', 'warning', 'error'];
  const allSources: OcclusionSource[] = [
    'none',
    'subtitle_screen',
    'other_seat',
    'wall',
    'parameter_error',
  ];

  const toggleType = (type: OcclusionType) => {
    const current = occlusionFilter.types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setOcclusionTypeFilter(next);
  };

  const toggleSeverity = (severity: OcclusionSeverity) => {
    const current = occlusionFilter.severities;
    const next = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    setOcclusionSeverityFilter(next);
  };

  const toggleSource = (source: OcclusionSource) => {
    const current = occlusionFilter.sources;
    const next = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    setOcclusionSourceFilter(next);
  };

  const selectAllTypes = () => setOcclusionTypeFilter([...allTypes]);
  const clearTypes = () => setOcclusionTypeFilter([]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">遮挡筛选</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSightLines(!showSightLines)}
            className={`p-1.5 rounded transition-colors ${
              showSightLines
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title={showSightLines ? '隐藏视线' : '显示视线'}
          >
            {showSightLines ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="showOnlySelected"
          checked={showOnlySelected}
          onChange={(e) => setShowOnlySelected(e.target.checked)}
          className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
        />
        <label
          htmlFor="showOnlySelected"
          className="text-sm text-slate-300 cursor-pointer"
        >
          仅显示选中座位
        </label>
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setTypeExpanded(!typeExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">遮挡类型</span>
          {typeExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {typeExpanded && (
          <div className="p-3 space-y-2 border-t border-slate-700">
            <div className="flex gap-2 mb-2">
              <button
                onClick={selectAllTypes}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
              >
                全选
              </button>
              <button
                onClick={clearTypes}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors"
              >
                清空
              </button>
            </div>

            {allTypes.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={occlusionFilter.types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded border-slate-600 bg-slate-700 focus:ring-cyan-500"
                  style={{ accentColor: OCCLUSION_TYPE_COLORS[type] }}
                />
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: OCCLUSION_TYPE_COLORS[type] }}
                />
                <span className="text-sm text-slate-300">
                  {OCCLUSION_TYPE_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSeverityExpanded(!severityExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">严重程度</span>
          {severityExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {severityExpanded && (
          <div className="p-3 space-y-2 border-t border-slate-700">
            {allSeverities.map((severity) => (
              <label
                key={severity}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={occlusionFilter.severities.includes(severity)}
                  onChange={() => toggleSeverity(severity)}
                  className="rounded border-slate-600 bg-slate-700 focus:ring-cyan-500"
                />
                <span
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    severity === 'error'
                      ? 'bg-red-500'
                      : severity === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-cyan-500'
                  }`}
                />
                <span className="text-sm text-slate-300">
                  {OCCLUSION_SEVERITY_LABELS[severity]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSourceExpanded(!sourceExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-200">遮挡来源</span>
          {sourceExpanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>

        {sourceExpanded && (
          <div className="p-3 space-y-2 border-t border-slate-700">
            {allSources.map((source) => (
              <label
                key={source}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-700/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={occlusionFilter.sources.includes(source)}
                  onChange={() => toggleSource(source)}
                  className="rounded border-slate-600 bg-slate-700 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-300">
                  {OCCLUSION_SOURCE_LABELS[source]}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
