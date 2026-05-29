import { useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { VestingList } from '../components/vesting/VestingList';
import { useVestingStore } from '../store/useVestingStore';
import { TrendingUp, Users, AlertTriangle, DollarSign } from 'lucide-react';
import { formatNumber } from '../utils/format';

export function VestingListPage() {
  const { summaries, fetchSummaries, fetchPlans, fetchExercises } =
    useVestingStore();

  useEffect(() => {
    fetchSummaries();
    fetchPlans();
    fetchExercises();
  }, [fetchSummaries, fetchPlans, fetchExercises]);

  const stats = {
    totalEmployees: summaries.length,
    totalGranted: summaries.reduce((sum, s) => sum + s.totalGranted, 0),
    totalVested: summaries.reduce((sum, s) => sum + s.totalVested, 0),
    totalExceptions: summaries.filter((s) => s.hasException).length,
  };

  return (
    <PageContainer
      title="归属台账"
      subtitle="统一管理员工期权归属记录，支持追溯计算过程、协议版本和行权状态"
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">员工总数</span>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="text-primary-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">
            {stats.totalEmployees}
          </div>
          <div className="text-xs text-slate-500 mt-1">人</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">授予总数</span>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-slate-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono">
            {formatNumber(stats.totalGranted)}
          </div>
          <div className="text-xs text-slate-500 mt-1">股</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">已归属</span>
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <DollarSign className="text-success-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-success-700 font-mono">
            {formatNumber(stats.totalVested)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            归属率{' '}
            {stats.totalGranted > 0
              ? ((stats.totalVested / stats.totalGranted) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">异常记录</span>
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-warning-600 font-mono">
            {stats.totalExceptions}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            条需要关注的记录
          </div>
        </div>
      </div>

      <VestingList />
    </PageContainer>
  );
}
