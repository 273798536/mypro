import { usePointStore } from '@/store/usePointStore';
import { statusLabels, sourceTypeLabels } from '@/types';
import type { PointStatus, SourceType } from '@/types';
import { Filter, ChevronRight } from 'lucide-react';

const statusColors = {
  normal: 'bg-green-100 text-green-700 border-green-200',
  abnormal: 'bg-red-100 text-red-700 border-red-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
};

const statusDotColors = {
  normal: 'bg-green-500',
  abnormal: 'bg-red-500',
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
};

const sourceColors = {
  gis_old: 'bg-blue-500',
  attachment: 'bg-purple-500',
  verbal: 'bg-orange-500',
};

export default function PointList() {
  const {
    getFilteredPoints,
    selectedPointId,
    selectPoint,
    filterStatus,
    filterSource,
    setFilterStatus,
    setFilterSource,
    getPointSources,
  } = usePointStore();

  const points = getFilteredPoints();

  const statusOptions: { value: PointStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'abnormal', label: '异常' },
    { value: 'pending', label: '待复核' },
    { value: 'normal', label: '正常' },
    { value: 'confirmed', label: '已确认' },
  ];

  const sourceOptions: { value: SourceType | 'all'; label: string }[] = [
    { value: 'all', label: '全部来源' },
    { value: 'gis_old', label: 'GIS旧版' },
    { value: 'attachment', label: '晚到附件' },
    { value: 'verbal', label: '口头备注' },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-slate-800">点位列表</h3>
          <span className="text-xs text-slate-500">共 {points.length} 条</span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PointStatus | 'all')}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-slate-400"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as SourceType | 'all')}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-slate-400"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {points.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            暂无符合条件的点位
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {points.map((point, index) => {
              const sources = getPointSources(point.id);
              const sourceTypes = [...new Set(sources.map((s) => s.type))];
              const isSelected = selectedPointId === point.id;

              return (
                <div
                  key={point.id}
                  onClick={() => selectPoint(isSelected ? null : point.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-100'
                      : index % 2 === 0
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColors[point.status]}`}
                        />
                        <span className="font-medium text-sm text-slate-800 truncate">
                          {point.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2 truncate">
                        {point.address}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border ${statusColors[point.status]}`}
                        >
                          {statusLabels[point.status]}
                        </span>
                        <div className="flex gap-1">
                          {sourceTypes.map((type) => (
                            <span
                              key={type}
                              className={`text-xs px-1.5 py-0.5 rounded text-white ${sourceColors[type]}`}
                              title={sourceTypeLabels[type]}
                            >
                              {sourceTypeLabels[type]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${
                        isSelected ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
