import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Filter, Search } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAmortizationStore } from '@/store/amortizationStore';
import type { AmortizationRecord, Project } from '@/types';

const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatPeriod = (period: string): string => {
  const [year, month] = period.split('-');
  return `${year}年${month}月`;
};

interface FilterState {
  period: string;
  projectId: string;
  status: 'all' | 'normal' | 'anomaly';
}

export default function AmortizationList() {
  const navigate = useNavigate();
  const { amortizationRecords, projects, anomalies } = useAmortizationStore();

  const [filters, setFilters] = useState<FilterState>({
    period: '',
    projectId: '',
    status: 'all',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const periods = useMemo(() => {
    const uniquePeriods = Array.from(new Set(amortizationRecords.map((r) => r.period)));
    return uniquePeriods.sort((a, b) => b.localeCompare(a));
  }, [amortizationRecords]);

  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : '未知项目';
  };

  const getRecordStatus = (record: AmortizationRecord): 'normal' | 'anomaly' => {
    const hasAnomaly = anomalies.some(
      (a) => a.amortizationId === record.id && !a.resolved
    );
    return hasAnomaly ? 'anomaly' : 'normal';
  };

  const filteredRecords = useMemo(() => {
    return amortizationRecords.filter((record) => {
      if (filters.period && record.period !== filters.period) return false;
      if (filters.projectId && record.projectId !== filters.projectId) return false;
      if (filters.status !== 'all') {
        const status = getRecordStatus(record);
        if (status !== filters.status) return false;
      }
      if (searchTerm) {
        const projectName = getProjectName(record.projectId).toLowerCase();
        const search = searchTerm.toLowerCase();
        if (!projectName.includes(search) && !record.period.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [amortizationRecords, filters, searchTerm, projects, anomalies]);

  const handleViewDetail = (id: string) => {
    navigate(`/amortization/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/amortization/${id}/edit`);
  };

  return (
    <PageContainer
      breadcrumbs={[{ label: '摊销管理' }, { label: '摊销列表' }]}
      userName="管理员"
    >
      <div className="space-y-6">
        <Card>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索项目名称或期间..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-neutral-500" />
                <select
                  value={filters.period}
                  onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                  className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                >
                  <option value="">全部月份</option>
                  {periods.map((period) => (
                    <option key={period} value={period}>
                      {formatPeriod(period)}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">全部项目</option>
                {projects.map((project: Project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as FilterState['status'] })
                }
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="all">全部状态</option>
                <option value="normal">正常</option>
                <option value="anomaly">异常</option>
              </select>
            </div>
          </div>
        </Card>

        <Card
          title="摊销记录"
          subtitle={`共 ${filteredRecords.length} 条记录`}
          actions={
            <button
              onClick={() => navigate('/amortization/new')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              + 新建摊销
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    项目名称
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    期间
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    原始成本
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    预留抵扣
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    共享分摊
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    净额
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filteredRecords.map((record, index) => {
                  const status = getRecordStatus(record);
                  const netAmount =
                    record.totalAmount - record.reservedDeduction - record.sharedAllocation;
                  return (
                    <tr
                      key={record.id}
                      className={`
                        transition-colors hover:bg-neutral-50
                        ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}
                        ${status === 'anomaly' ? 'bg-amber-50/30 hover:bg-amber-50/50' : ''}
                      `}
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-neutral-900">
                          {getProjectName(record.projectId)}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {record.id}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-600">
                        {formatPeriod(record.period)}
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-900 text-right font-mono">
                        {formatCurrency(record.totalAmount)}
                      </td>
                      <td className="py-4 px-4 text-sm text-emerald-600 text-right font-mono">
                        -{formatCurrency(record.reservedDeduction)}
                      </td>
                      <td className="py-4 px-4 text-sm text-blue-600 text-right font-mono">
                        -{formatCurrency(record.sharedAllocation)}
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-900 text-right font-mono font-semibold">
                        {formatCurrency(netAmount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge
                          status={status}
                          label={status === 'normal' ? '正常' : '异常'}
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetail(record.id)}
                            className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(record.id)}
                            className="p-1.5 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRecords.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无匹配的摊销记录</p>
                <p className="text-xs text-neutral-400 mt-1">请尝试调整筛选条件</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
