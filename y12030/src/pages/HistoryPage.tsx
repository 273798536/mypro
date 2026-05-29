import { useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { HistoryList } from '../components/history/HistoryList';
import { useVestingStore } from '../store/useVestingStore';
import { FileEdit, AlertTriangle, Clock, Users } from 'lucide-react';

export function HistoryPage() {
  const { history, fetchHistory } = useVestingStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const uniqueEmployees = new Set(
    history.map((h) => (h as any).employeeId).filter(Boolean),
  ).size;

  const stats = {
    totalCorrections: history.length,
    sharesCorrections: history.filter((h) => h.fieldName === 'totalShares').length,
    agreementCorrections: history.filter((h) => h.fieldName === 'agreementVersion')
      .length,
    affectedEmployees: uniqueEmployees,
  };

  return (
    <PageContainer
      title="历史记录"
      subtitle="查看所有归属修正的审计记录，包含变更前后对比和修正原因"
    >
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">总修正次数</span>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileEdit className="text-primary-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-primary-700 font-mono">
            {stats.totalCorrections}
          </div>
          <div className="text-xs text-slate-500 mt-1">次操作</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">数量修正</span>
            <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-warning-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-warning-600 font-mono">
            {stats.sharesCorrections}
          </div>
          <div className="text-xs text-slate-500 mt-1">次授予数量调整</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">协议变更</span>
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Clock className="text-slate-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-700 font-mono">
            {stats.agreementCorrections}
          </div>
          <div className="text-xs text-slate-500 mt-1">次协议版本更新</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">影响员工</span>
            <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
              <Users className="text-success-600" size={20} />
            </div>
          </div>
          <div className="text-3xl font-bold text-success-700 font-mono">
            {stats.affectedEmployees}
          </div>
          <div className="text-xs text-slate-500 mt-1">名员工受影响</div>
        </div>
      </div>

      <HistoryList />
    </PageContainer>
  );
}
