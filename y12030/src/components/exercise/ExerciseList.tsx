import { useState } from 'react';
import { useVestingStore } from '../../store/useVestingStore';
import {
  formatNumber,
  formatDate,
  getExerciseStatusText,
} from '../../utils/format';
import { StatusBadge } from '../common/StatusBadge';
import { Check, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Exercise } from '../../../shared/types';

export function ExerciseList() {
  const { exercises, approveExercise } = useVestingStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (id: string) => {
    await approveExercise(id, 'approved', '财务-刘总');
    setExpandedId(null);
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) return;
    await approveExercise(id, 'rejected', '财务-刘总', rejectionReason);
    setExpandedId(null);
    setRejectionReason('');
  };

  const sortedExercises = [...exercises].sort(
    (a, b) =>
      new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime(),
  );

  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>申请信息</th>
            <th>员工</th>
            <th className="text-right">申请股数</th>
            <th>行权价格</th>
            <th>公允价值</th>
            <th className="text-right">收益</th>
            <th>申请日期</th>
            <th>状态</th>
            <th className="text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {sortedExercises.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              expanded={expandedId === exercise.id}
              onToggle={() =>
                setExpandedId(expandedId === exercise.id ? null : exercise.id)
              }
              onApprove={() => handleApprove(exercise.id)}
              onReject={() => handleReject(exercise.id)}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ExerciseRowProps {
  exercise: Exercise & { employeeName?: string; grantTotalShares?: number };
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  rejectionReason: string;
  setRejectionReason: (v: string) => void;
}

function ExerciseRow({
  exercise,
  expanded,
  onToggle,
  onApprove,
  onReject,
  rejectionReason,
  setRejectionReason,
}: ExerciseRowProps) {
  const profit = (exercise.fairMarketValue - exercise.exercisePrice) * exercise.shares;

  return (
    <>
      <tr className={expanded ? 'bg-primary-50/30' : ''}>
        <td>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="font-mono text-xs text-slate-500">{exercise.id}</span>
          </div>
        </td>
        <td>
          <div className="font-medium text-slate-900">
            {exercise.employeeName || exercise.applicant}
          </div>
          <div className="text-xs text-slate-500">申请人：{exercise.applicant}</div>
        </td>
        <td className="text-right font-mono font-semibold text-slate-900">
          {formatNumber(exercise.shares)}
        </td>
        <td className="font-mono text-slate-600">
          ¥{exercise.exercisePrice.toFixed(2)}
        </td>
        <td className="font-mono text-slate-600">
          ¥{exercise.fairMarketValue.toFixed(2)}
        </td>
        <td className="text-right font-mono font-semibold text-success-700">
          ¥{formatNumber(Math.round(profit))}
        </td>
        <td className="text-slate-600">{formatDate(exercise.applicationDate)}</td>
        <td>
          <StatusBadge
            status={exercise.status}
            text={getExerciseStatusText(exercise.status)}
          />
        </td>
        <td className="text-center">
          {exercise.status === 'pending' && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onApprove}
                className="p-2 text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                title="通过"
              >
                <Check size={16} />
              </button>
              <button
                onClick={onToggle}
                className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                title="驳回"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {exercise.status === 'rejected' && exercise.rejectionReason && (
            <div className="text-xs text-danger-600">
              {exercise.rejectionReason}
            </div>
          )}
          {exercise.status === 'approved' && exercise.approver && (
            <div className="text-xs text-slate-500">
              {exercise.approver}
            </div>
          )}
        </td>
      </tr>
      {expanded && exercise.status === 'pending' && (
        <tr className="bg-slate-50">
          <td colSpan={9} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  驳回原因
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="请输入驳回原因..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-danger-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={onReject}
                  disabled={!rejectionReason.trim()}
                  className="btn btn-danger disabled:opacity-50"
                >
                  确认驳回
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
