import { useValuationStore } from '@/store/valuationStore';
import { fundNames, allValuationMethods, dataSourceLabels } from '@/data/mockData';
import { Filter, X } from 'lucide-react';
import type { DataSourceType } from '@/types';

export default function FilterPanel() {
  const { filters, setFilters, resetFilters, projects } = useValuationStore();

  const toggleFund = (fund: string) => {
    const current = filters.fundNames;
    setFilters({
      fundNames: current.includes(fund)
        ? current.filter((f) => f !== fund)
        : [...current, fund],
    });
  };

  const toggleProject = (projectId: string) => {
    const current = filters.projectIds;
    setFilters({
      projectIds: current.includes(projectId)
        ? current.filter((p) => p !== projectId)
        : [...current, projectId],
    });
  };

  const toggleMethod = (method: string) => {
    const current = filters.valuationMethods;
    setFilters({
      valuationMethods: current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method],
    });
  };

  const toggleDataSource = (source: DataSourceType) => {
    const current = filters.dataSources;
    setFilters({
      dataSources: current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source],
    });
  };

  const hasActiveFilters = 
    filters.fundNames.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.valuationMethods.length > 0 ||
    filters.dataSources.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-slate-800">筛选条件</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600 transition-colors"
          >
            <X className="w-4 h-4" />
            重置
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">所属基金</label>
          <div className="flex flex-wrap gap-2">
            {fundNames.map((fund) => (
              <button
                key={fund}
                onClick={() => toggleFund(fund)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.fundNames.includes(fund)
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {fund}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">投资项目</label>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <button
                key={project.projectId}
                onClick={() => toggleProject(project.projectId)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.projectIds.includes(project.projectId)
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {project.projectName}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">日期范围</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-slate-400">至</span>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">估值方法</label>
          <div className="flex flex-wrap gap-2">
            {allValuationMethods.map((method) => (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.valuationMethods.includes(method)
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">数据来源</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dataSourceLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleDataSource(key as DataSourceType)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filters.dataSources.includes(key as DataSourceType)
                    ? 'bg-amber-100 text-amber-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
