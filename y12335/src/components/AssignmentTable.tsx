import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import type { Assignment, AnomalyType } from '@/types';

type SortKey = 'volunteerName' | 'positionName' | 'timeSlot' | 'anomalyType';
type SortDir = 'asc' | 'desc';

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  vacancy: '空缺',
  skill_mismatch: '技能不匹配',
  shift_conflict: '班次冲突',
  leave_conflict: '请假冲突',
};

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  vacancy: 'bg-amber-500/20 text-amber-400',
  skill_mismatch: 'bg-rose-500/20 text-rose-400',
  shift_conflict: 'bg-orange-500/20 text-orange-400',
  leave_conflict: 'bg-yellow-500/20 text-yellow-400',
};

export function AssignmentTable() {
  const getFilteredAssignments = useStore((s) => s.getFilteredAssignments);
  const getVolunteerById = useStore((s) => s.getVolunteerById);
  const getPositionById = useStore((s) => s.getPositionById);
  const getShiftById = useStore((s) => s.getShiftById);
  const setSelectedAssignment = useStore((s) => s.setSelectedAssignment);
  const selectedAssignmentId = useStore((s) => s.selectedAssignmentId);

  const [sortKey, setSortKey] = useState<SortKey>('volunteerName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const assignments = getFilteredAssignments();

  const enriched = useMemo(() => {
    return assignments.map((a: Assignment) => {
      const vol = getVolunteerById(a.volunteerId);
      const shift = getShiftById(a.shiftId);
      const pos = shift ? getPositionById(shift.positionId) : undefined;
      const timeSlotLabel = TIME_SLOTS.find((t) => t.id === shift?.timeSlot)?.label ?? shift?.timeSlot ?? '';

      let skillMatch = false;
      if (vol && pos) {
        skillMatch = pos.requiredSkillIds.some((sid) => vol.skillIds.includes(sid));
      }

      return { assignment: a, volunteerName: vol?.name ?? '', positionName: pos?.name ?? '', timeSlotLabel, skillMatch };
    });
  }, [assignments, getVolunteerById, getPositionById, getShiftById]);

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'volunteerName':
          cmp = a.volunteerName.localeCompare(b.volunteerName, 'zh');
          break;
        case 'positionName':
          cmp = a.positionName.localeCompare(b.positionName, 'zh');
          break;
        case 'timeSlot':
          cmp = a.timeSlotLabel.localeCompare(b.timeSlotLabel, 'zh');
          break;
        case 'anomalyType':
          cmp = (a.assignment.anomalyType ?? '').localeCompare(b.assignment.anomalyType ?? '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [enriched, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-200 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? 'text-brand-400' : 'text-gray-600'}`} />
      </div>
    </th>
  );

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="bg-surface-800 sticky top-0 z-10">
          <tr>
            <SortHeader label="志愿者" field="volunteerName" />
            <SortHeader label="岗位" field="positionName" />
            <SortHeader label="时段" field="timeSlot" />
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">技能匹配</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">异常类型</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {sorted.map(({ assignment, volunteerName, positionName, timeSlotLabel, skillMatch }) => (
            <tr
              key={assignment.id}
              onClick={() => setSelectedAssignment(assignment.id)}
              className={`cursor-pointer transition-colors hover:bg-surface-700/50 ${
                selectedAssignmentId === assignment.id ? 'bg-brand-500/10' : ''
              } ${assignment.isAnomaly ? 'border-l-2 border-l-danger' : ''}`}
            >
              <td className="px-4 py-3 font-medium text-gray-200">{volunteerName}</td>
              <td className="px-4 py-3 text-gray-300">{positionName}</td>
              <td className="px-4 py-3 font-mono text-gray-300">{timeSlotLabel}</td>
              <td className="px-4 py-3">
                {skillMatch ? (
                  <span className="text-brand-400">✓</span>
                ) : (
                  <span className="text-danger">✗</span>
                )}
              </td>
              <td className="px-4 py-3">
                {assignment.anomalyType ? (
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ANOMALY_COLORS[assignment.anomalyType]}`}>
                    {ANOMALY_LABELS[assignment.anomalyType]}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-500 text-sm">暂无分配数据</div>
      )}
    </div>
  );
}
