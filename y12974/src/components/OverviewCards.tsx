import { Clock, AlertTriangle, Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { ReportData, VerifyStatus } from '../types';

interface OverviewCardsProps {
  report: ReportData;
}

const statusConfig: Record<VerifyStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: '通过' },
  warning: { icon: AlertCircle, color: 'text-amber-600 bg-amber-50', label: '警告' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: '未通过' }
};

export default function OverviewCards({ report }: OverviewCardsProps) {
  const backupConfig = statusConfig[report.backupVerifyStatus];
  const BackupIcon = backupConfig.icon;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const cards = [
    {
      title: '慢查询总数',
      value: report.slowQueryCount,
      unit: '条',
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
      description: `耗时超过1秒的查询，其中${report.indexFailureCount}条存在索引失效`
    },
    {
      title: '索引失效',
      value: report.indexFailureCount,
      unit: '条',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
      description: `已从慢查询中单独拦截，占比 ${((report.indexFailureCount / report.slowQueryCount) * 100).toFixed(1)}%`
    },
    {
      title: 'Schema 版本',
      value: report.schemaVersion,
      unit: '',
      icon: Database,
      color: 'text-indigo-600 bg-indigo-50',
      description: `当前使用的数据库结构版本`
    },
    {
      title: '备份校验',
      value: backupConfig.label,
      unit: '',
      icon: BackupIcon,
      color: backupConfig.color,
      description: `${report.backupVerifyItems.filter(v => v.status === 'passed').length} 项通过, ${report.backupVerifyItems.filter(v => v.status !== 'passed').length} 项异常`
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">运行概览</h2>
        <div className="text-sm text-gray-500">
          运行批次: <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{report.runId}</code>
          <span className="ml-3">生成时间: {formatDate(report.generatedAt)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">{card.value}</span>
                    {card.unit && <span className="ml-1 text-sm text-gray-500">{card.unit}</span>}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">{card.description}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
