import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useStore } from '@/store/useStore';

const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

const ANOMALY_LABELS: Record<string, string> = {
  vacancy: '空缺',
  skill_mismatch: '技能不匹配',
  shift_conflict: '班次冲突',
  leave_conflict: '请假冲突',
};

const ANOMALY_COLORS: Record<string, string> = {
  vacancy: '#f43f5e',
  skill_mismatch: '#f59e0b',
  shift_conflict: '#8b5cf6',
  leave_conflict: '#06b6d4',
};

export function StatsCharts() {
  const { skills, getFilteredVolunteers, positions, shifts, currentResult, getFilteredAnomalies } = useStore();
  const volunteers = getFilteredVolunteers();
  const anomalies = getFilteredAnomalies();

  const skillCoverageData = skills.map(skill => ({
    name: skill.name,
    count: volunteers.filter(v => v.skillIds.includes(skill.id)).length,
  }));

  const positionFillData = positions.map(pos => {
    const total = shifts.filter(s => s.positionId === pos.id).reduce((sum, s) => sum + s.requiredCount, 0);
    const assigned = currentResult
      ? currentResult.assignments.filter(a => {
          const sh = shifts.find(s => s.id === a.shiftId);
          return sh?.positionId === pos.id;
        }).length
      : 0;
    return {
      name: pos.name,
      value: total > 0 ? Math.round((assigned / total) * 100) : 0,
    };
  });

  const anomalyDistribution = Object.entries(ANOMALY_LABELS).map(([key, label]) => ({
    name: label,
    count: anomalies.filter(a => a.type === key).length,
    fill: ANOMALY_COLORS[key],
  }));

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <BarChart3 className="h-4 w-4 text-brand-500" />
        统计图表
      </h3>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs text-gray-500">技能覆盖人数</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={skillCoverageData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#273548', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-500">岗位填充率</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={positionFillData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ name, value }) => `${name} ${value}%`}
              >
                {positionFillData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#273548', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="mb-2 text-xs text-gray-500">异常分布</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={anomalyDistribution}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#273548', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {anomalyDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
