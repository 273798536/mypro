import { useState } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import { cn } from '@/lib/utils';
import type { AnomalyType } from '@/types';

const ANOMALY_OPTIONS: { value: AnomalyType; label: string }[] = [
  { value: 'vacancy', label: '空缺' },
  { value: 'skill_mismatch', label: '技能不匹配' },
  { value: 'shift_conflict', label: '班次冲突' },
  { value: 'leave_conflict', label: '请假冲突' },
];

const CATEGORY_COLORS: Record<string, string> = {
  '服务': 'bg-blue-500/20 text-blue-400',
  '安保': 'bg-red-500/20 text-red-400',
  '医疗': 'bg-rose-500/20 text-rose-400',
  '语言': 'bg-violet-500/20 text-violet-400',
  '技术': 'bg-cyan-500/20 text-cyan-400',
  '宣传': 'bg-amber-500/20 text-amber-400',
};

export { CATEGORY_COLORS };

export function FilterBar() {
  const { skills, filter, setFilter } = useStore();
  const [skillOpen, setSkillOpen] = useState(false);

  const toggleSkill = (skillId: string) => {
    const next = filter.skillIds.includes(skillId)
      ? filter.skillIds.filter(id => id !== skillId)
      : [...filter.skillIds, skillId];
    setFilter({ skillIds: next });
  };

  const toggleAnomaly = (type: AnomalyType) => {
    const next = filter.anomalyTypes.includes(type)
      ? filter.anomalyTypes.filter(t => t !== type)
      : [...filter.anomalyTypes, type];
    setFilter({ anomalyTypes: next });
  };

  const getSkillById = useStore(s => s.getSkillById);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-800 border border-surface-700 px-4 py-3">
      <Filter className="h-4 w-4 text-gray-500" />

      <div className="relative flex items-center gap-2">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="搜索志愿者..."
          value={filter.searchQuery}
          onChange={e => setFilter({ searchQuery: e.target.value })}
          className="w-40 rounded-lg bg-surface-700 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setSkillOpen(!skillOpen)}
          className="flex items-center gap-1.5 rounded-lg bg-surface-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-surface-600"
        >
          技能筛选
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', skillOpen && 'rotate-180')} />
        </button>
        {skillOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 flex flex-wrap gap-1.5 rounded-lg bg-surface-800 border border-surface-700 p-3 shadow-xl">
            {skills.map(skill => (
              <button
                key={skill.id}
                onClick={() => toggleSkill(skill.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  filter.skillIds.includes(skill.id)
                    ? CATEGORY_COLORS[skill.category] || 'bg-brand-500/20 text-brand-400'
                    : 'bg-surface-700 text-gray-500 hover:text-gray-300'
                )}
              >
                {skill.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {filter.skillIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filter.skillIds.map(id => {
            const skill = getSkillById(id);
            if (!skill) return null;
            return (
              <span
                key={id}
                className={cn('rounded-md px-2 py-0.5 text-xs font-medium', CATEGORY_COLORS[skill.category])}
              >
                {skill.name}
                <button onClick={() => toggleSkill(id)} className="ml-1 opacity-60 hover:opacity-100">×</button>
              </span>
            );
          })}
        </div>
      )}

      <select
        value={filter.timeSlot ?? ''}
        onChange={e => setFilter({ timeSlot: e.target.value || null })}
        className="rounded-lg bg-surface-700 px-3 py-1.5 text-sm text-gray-300 outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">全部时段</option>
        {TIME_SLOTS.map(ts => (
          <option key={ts.id} value={ts.id}>{ts.label}</option>
        ))}
      </select>

      <div className="flex items-center gap-2 border-l border-surface-700 pl-3">
        {ANOMALY_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-1.5 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={filter.anomalyTypes.includes(opt.value)}
              onChange={() => toggleAnomaly(opt.value)}
              className="accent-brand-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
