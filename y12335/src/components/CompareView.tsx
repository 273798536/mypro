import { useStore } from '@/store/useStore';
import { TIME_SLOTS } from '@/data/mockData';
import type { Assignment, AssignmentResult } from '@/types';

interface RowData {
  id: string;
  volunteerName: string;
  positionName: string;
  timeSlotLabel: string;
  isAnomaly: boolean;
  anomalyType?: string;
  _diff: 'new' | 'removed' | null;
}

function buildRows(
  result: AssignmentResult,
  getVolunteerById: (id: string) => ReturnType<typeof useStore.getState>['getVolunteerById'] extends (...args: any[]) => infer R ? R : never,
  getPositionById: (id: string) => ReturnType<typeof useStore.getState>['getPositionById'] extends (...args: any[]) => infer R ? R : never,
  getShiftById: (id: string) => ReturnType<typeof useStore.getState>['getShiftById'] extends (...args: any[]) => infer R ? R : never,
  diffIds: Set<string>,
  diffType: 'new' | 'removed',
): RowData[] {
  return result.assignments.map((a: Assignment) => {
    const vol = getVolunteerById(a.volunteerId);
    const shift = getShiftById(a.shiftId);
    const pos = shift ? getPositionById(shift.positionId) : undefined;
    const ts = TIME_SLOTS.find(t => t.id === shift?.timeSlot);
    return {
      id: a.id,
      volunteerName: vol?.name ?? '—',
      positionName: pos?.name ?? '—',
      timeSlotLabel: ts?.label ?? shift?.timeSlot ?? '—',
      isAnomaly: a.isAnomaly,
      anomalyType: a.anomalyType,
      _diff: diffIds.has(a.id) ? diffType : null,
    };
  });
}

function ColumnTable({ rows, title, count }: { rows: RowData[]; title: string; count: number }) {
  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{count} 条分配</p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-700 text-gray-400">
              <th className="py-2 px-2 text-left font-medium">志愿者</th>
              <th className="py-2 px-2 text-left font-medium">岗位</th>
              <th className="py-2 px-2 text-left font-medium">时段</th>
              <th className="py-2 px-2 text-left font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const bgClass = row._diff === 'new'
                ? 'bg-brand-500/15'
                : row._diff === 'removed'
                  ? 'bg-danger/15'
                  : '';
              const textClass = row._diff === 'removed' ? 'line-through text-gray-500' : '';
              return (
                <tr key={row.id} className={`border-b border-surface-700/50 ${bgClass} ${textClass}`}>
                  <td className="py-1.5 px-2 font-mono">{row.volunteerName}</td>
                  <td className="py-1.5 px-2">{row.positionName}</td>
                  <td className="py-1.5 px-2">{row.timeSlotLabel}</td>
                  <td className="py-1.5 px-2">
                    {row.isAnomaly ? (
                      <span className="text-danger">{row.anomalyType ?? '异常'}</span>
                    ) : (
                      <span className="text-brand-400">正常</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-500">无分配记录</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompareView() {
  const currentResult = useStore(s => s.currentResult);
  const previousResult = useStore(s => s.previousResult);
  const getVolunteerById = useStore(s => s.getVolunteerById);
  const getPositionById = useStore(s => s.getPositionById);
  const getShiftById = useStore(s => s.getShiftById);

  if (!previousResult) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-8 text-center">
        <p className="text-gray-500">尚无修正历史</p>
        <p className="text-xs text-gray-600 mt-1">修改志愿者技能后将自动生成对比</p>
      </div>
    );
  }

  if (!currentResult) return null;

  const oldIds = new Set(previousResult.assignments.map(a => a.id));
  const newIds = new Set(currentResult.assignments.map(a => a.id));

  const removedIds = new Set(previousResult.assignments.filter(a => !newIds.has(a.id)).map(a => a.id));
  const addedIds = new Set(currentResult.assignments.filter(a => !oldIds.has(a.id)).map(a => a.id));

  const leftRows = buildRows(previousResult, getVolunteerById, getPositionById, getShiftById, removedIds, 'removed');
  const rightRows = buildRows(currentResult, getVolunteerById, getPositionById, getShiftById, addedIds, 'new');

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <ColumnTable rows={leftRows} title="修正前" count={previousResult.assignments.length} />
        <ColumnTable rows={rightRows} title="修正后" count={currentResult.assignments.length} />
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 px-2 mt-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-brand-500/30 border border-brand-500/50" />
          新增分配
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-danger/30 border border-danger/50" />
          已移除
        </span>
      </div>
    </div>
  );
}
