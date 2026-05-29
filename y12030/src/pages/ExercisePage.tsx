import { useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { ExerciseList } from '../components/exercise/ExerciseList';
import { useVestingStore } from '../store/useVestingStore';
import { Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { formatNumber } from '../utils/format';

export function ExercisePage() {
  const { exercises, fetchExercises } = useVestingStore();

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const stats = {
    pending: exercises.filter((e) => e.status === 'pending').length,
    approved: exercises.filter((e) => e.status === 'approved' || e.status === 'completed').length,
    rejected: exercises.filter((e) => e.status === 'rejected').length,
    totalValue: exercises
      .filter((e) => e.status === 'approved' || e.status === 'completed')
      .reduce((sum, e) => sum + (e.fairMarketValue - e.exercisePrice) * e.shares, 0),
  };

  return (
    <PageContainer
      title="行权申请"
      subtitle="管理员工行权申请，审批和查看行权历史"
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">待审批</span>
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="text-warning-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-warning-600 font-mono">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 mt-1">条申请待处理</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">已通过</span>
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-success-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-success-700 font-mono">
            {stats.approved}
          </div>
          <div className="text-xs text-slate-500 mt-1">条申请已通过</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">已驳回</span>
            <div className="w-10 h-10 bg-danger-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-danger-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-danger-700 font-mono">
            {stats.rejected}
          </div>
          <div className="text-xs text-slate-500 mt-1">条申请已驳回</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">累计收益</span>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-primary-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-primary-700 font-mono">
            ¥{formatNumber(Math.round(stats.totalValue))}
          </div>
          <div className="text-xs text-slate-500 mt-1">已行权总收益</div>
        </div>
      </div>

      <ExerciseList />
    </PageContainer>
  );
}
