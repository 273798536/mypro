import { useStore } from '../store/useStore';
import { filmProjects, expenseCategories } from '../data/mockData';
import { Filter, RotateCcw } from 'lucide-react';

const statusOptions = [
  { value: 'normal', label: '正常' },
  { value: 'missing_fields', label: '缺字段' },
  { value: 'late_supplement', label: '晚补' },
  { value: 'category_mismatch', label: '科目串片' },
];

export default function FilterBar() {
  const { filters, setFilters, resetFilters } = useStore();

  const handleChange = (key: string, value: string) => {
    if (value === '') {
      const { [key as keyof typeof filters]: _, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ ...filters, [key]: value });
    }
  };

  const handleDateChange = (key: 'start' | 'end', value: string) => {
    const currentRange = filters.dateRange || { start: '', end: '' };
    const newRange = { ...currentRange, [key]: value };
    if (newRange.start && newRange.end) {
      setFilters({ ...filters, dateRange: newRange });
    } else if (!newRange.start && !newRange.end) {
      const { dateRange: _, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ ...filters, dateRange: newRange });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-700">筛选条件</h3>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            影片项目
          </label>
          <select
            value={filters.projectId || ''}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">全部影片</option>
            {filmProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            费用科目
          </label>
          <select
            value={filters.expenseCategory || ''}
            onChange={(e) => handleChange('expenseCategory', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">全部科目</option>
            {expenseCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            账单状态
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">全部状态</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            开始日期
          </label>
          <input
            type="date"
            value={filters.dateRange?.start || ''}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            结束日期
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="重置筛选"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
