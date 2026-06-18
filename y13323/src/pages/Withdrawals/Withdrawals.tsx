import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  FileText,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  formatDate,
  getImpactLabel,
  getImpactColor,
  getStatusLabel,
  getStatusColor,
} from '@/utils/format';
import clsx from 'clsx';

export default function Withdrawals() {
  const { withdrawals } = useAppStore();
  const navigate = useNavigate();

  const sortedWithdrawals = [...withdrawals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-status-error/10 rounded-lg">
              <RotateCcw size={20} className="text-status-error" />
            </div>
            <div>
              <p className="text-2xl font-bold text-deep-blue-500 font-mono">
                {withdrawals.length}
              </p>
              <p className="text-sm text-gray-500">总撤回记录</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-status-warning/10 rounded-lg">
              <AlertTriangle size={20} className="text-status-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-deep-blue-500 font-mono">
                {withdrawals.filter((w) => w.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">进行中</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-status-success/10 rounded-lg">
              <FileText size={20} className="text-status-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-deep-blue-500 font-mono">
                {withdrawals.reduce((sum, w) => sum + w.affectedSampleCount, 0)}
              </p>
              <p className="text-sm text-gray-500">受影响样本</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {sortedWithdrawals.map((withdrawal, index) => (
          <Card
            key={withdrawal.id}
            hover
            className="p-5"
            onClick={() => navigate(`/withdrawals/${withdrawal.id}`)}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-gray-900 text-base">
                    {withdrawal.title}
                  </h3>
                  <Badge variant={withdrawal.status === 'active' ? 'error' : withdrawal.status === 'resolved' ? 'success' : 'info'}>
                    {getStatusLabel(withdrawal.status)}
                  </Badge>
                  <span
                    className={clsx(
                      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
                      getImpactColor(withdrawal.impactLevel)
                    )}
                  >
                    {getImpactLabel(withdrawal.impactLevel)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {withdrawal.reason}
                </p>

                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} />
                    影响 {withdrawal.affectedSampleCount} 份样本
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={13} />
                    {withdrawal.createdBy}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {formatDate(withdrawal.createdAt)}
                  </span>
                </div>

                {withdrawal.oralNotes && (
                  <div className="mt-3 p-3 bg-status-warning/5 border border-status-warning/20 rounded-lg">
                    <p className="text-xs text-status-warning font-medium mb-1">
                      💬 口头说明
                    </p>
                    <p className="text-sm text-gray-600">
                      {withdrawal.oralNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 ml-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">结论变化</p>
                  <p className="text-sm text-gray-700 font-medium max-w-48">
                    {withdrawal.conclusionChange}
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">影响样本：</span>
                <div className="flex -space-x-2">
                  {withdrawal.affectedSampleIds.slice(0, 3).map((id) => (
                    <div
                      key={id}
                      className="w-7 h-7 rounded-full bg-accent-blue-100 border-2 border-white flex items-center justify-center text-xs text-accent-blue-600 font-medium"
                    >
                      {id.split('-')[1]}
                    </div>
                  ))}
                  {withdrawal.affectedSampleIds.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                      +{withdrawal.affectedSampleIds.length - 3}
                    </div>
                  )}
                </div>
              </div>
              <button className="text-sm text-accent-blue-500 hover:text-accent-blue-600 flex items-center gap-1 transition-colors">
                查看详情
                <ArrowRight size={14} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
