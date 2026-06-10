import { useState, useMemo } from 'react';
import {
  GitBranch,
  Search,
  Calendar,
  User,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Activity,
} from 'lucide-react';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSampleStore } from '@/stores/sampleStore';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { VersionTimeline } from '@/components/VersionTimeline';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';
import { SampleVersion } from '@/types';

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function LineagePage() {
  const {
    versions,
    conclusions,
    auditLogs,
    getVersionHistory,
    generateLineageGraph,
    lineageGraph,
    selectedBarcode,
    setSelectedBarcode,
    setSearchQuery,
    searchQuery,
    users,
  } = useSampleStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'lineage' | 'audit'>('overview');

  const uniqueBarcodes = useMemo(() => {
    const barcodes = new Set(versions.map((v) => v.barcode));
    return Array.from(barcodes);
  }, [versions]);

  const filteredBarcodes = useMemo(() => {
    if (!searchQuery) return uniqueBarcodes;
    const query = searchQuery.toLowerCase();
    return uniqueBarcodes.filter((b) => b.toLowerCase().includes(query));
  }, [uniqueBarcodes, searchQuery]);

  const stats = useMemo(() => {
    const confirmed = conclusions.filter((c) => c.isFinal).length;
    const withDuplicates = versions.filter((v) => v.isDuplicate).length;
    const withCorrections = versions.filter((v) => v.manualCorrections.length > 0).length;
    const avgVersionsPerSample = versions.length / Math.max(uniqueBarcodes.length, 1);

    return {
      totalSamples: uniqueBarcodes.length,
      totalVersions: versions.length,
      confirmedConclusions: confirmed,
      withDuplicates,
      withCorrections,
      avgVersionsPerSample: avgVersionsPerSample.toFixed(1),
    };
  }, [versions, conclusions, uniqueBarcodes]);

  const versionTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().subtract(6 - i, 'day');
      const startOfDay = date.startOf('day').valueOf();
      const endOfDay = date.endOf('day').valueOf();
      const count = versions.filter(
        (v) => v.createdAt >= startOfDay && v.createdAt <= endOfDay
      ).length;
      return {
        date: date.format('MM-DD'),
        版本数: count,
      };
    });
    return last7Days;
  }, [versions]);

  const statusDistribution = useMemo(() => {
    const statuses = ['pending', 'analyzing', 'reviewing', 'confirmed', 'conflict'];
    const labels: Record<string, string> = {
      pending: '待处理',
      analyzing: '分析中',
      reviewing: '复核中',
      confirmed: '已确认',
      conflict: '有冲突',
    };
    return statuses.map((status) => ({
      name: labels[status],
      value: versions.filter((v) => v.status === status).length,
    })).filter((d) => d.value > 0);
  }, [versions]);

  const handleSelectBarcode = (barcode: string) => {
    setSelectedBarcode(barcode);
    generateLineageGraph(barcode);
    setActiveTab('lineage');
  };

  const handleSelectVersion = (version: SampleVersion) => {
    setSelectedBarcode(version.barcode);
    generateLineageGraph(version.barcode);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent-100 text-accent-700';
      case 'reviewing':
        return 'bg-warning-100 text-warning-700';
      case 'pending':
        return 'bg-primary-100 text-primary-700';
      case 'conflict':
        return 'bg-danger-100 text-danger-700';
      default:
        return 'bg-lab-bg text-lab-text';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">样本总数</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.totalSamples}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <GitBranch size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">版本总数</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.totalVersions}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">已确认</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.confirmedConclusions}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">含重复</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.withDuplicates}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Activity size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">含修正</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.withCorrections}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <BarChart3 size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">平均版本</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.avgVersionsPerSample}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-lab-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative',
            activeTab === 'overview'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          数据概览
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('lineage')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative',
            activeTab === 'lineage'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          谱系追踪
          {activeTab === 'lineage' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'px-6 py-3 text-sm font-medium transition-colors relative',
            activeTab === 'audit'
              ? 'text-primary-600'
              : 'text-lab-textMuted hover:text-lab-text'
          )}
        >
          审计日志
          {activeTab === 'audit' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 lab-card p-6">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-500" />
              近7天版本创建趋势
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={versionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="版本数" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lab-card p-6">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <Activity size={18} className="text-accent-500" />
              状态分布
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {statusDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-lab-textMuted">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 lab-card p-6">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-500" />
              样本列表 - 点击查看谱系
            </h3>
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lab-textMuted" size={18} />
                <input
                  type="text"
                  placeholder="搜索样本条码..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 input-field"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>样本条码</th>
                    <th>基因名称</th>
                    <th>版本数</th>
                    <th>最新状态</th>
                    <th>最新操作人</th>
                    <th>最后更新</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBarcodes.map((barcode) => {
                    const history = getVersionHistory(barcode);
                    const latest = history[history.length - 1];
                    const operator = users.find((u) => u.id === latest?.createdBy);
                    return (
                      <tr key={barcode} className="hover:bg-lab-bg/50 cursor-pointer" onClick={() => handleSelectBarcode(barcode)}>
                        <td className="font-mono font-medium text-primary-600">{barcode}</td>
                        <td>{latest?.sequencingResult.geneName || '-'}</td>
                        <td className="font-mono">{history.length}</td>
                        <td>
                          <span className={cn('px-2 py-1 rounded-md text-xs font-medium', getStatusColor(latest?.status || 'pending'))}>
                            {latest?.status === 'confirmed' && '已确认'}
                            {latest?.status === 'reviewing' && '复核中'}
                            {latest?.status === 'pending' && '待处理'}
                            {latest?.status === 'conflict' && '有冲突'}
                            {latest?.status === 'analyzing' && '分析中'}
                          </span>
                        </td>
                        <td>{operator?.name || '-'}</td>
                        <td className="text-xs text-lab-textMuted">
                          {latest ? dayjs(latest.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
                        </td>
                        <td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectBarcode(barcode);
                            }}
                            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            查看谱系
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lineage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="lab-card p-4 mb-4">
              <h3 className="font-medium text-lab-text mb-3">选择样本</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredBarcodes.map((barcode) => {
                  const history = getVersionHistory(barcode);
                  const latest = history[history.length - 1];
                  return (
                    <button
                      key={barcode}
                      onClick={() => handleSelectBarcode(barcode)}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-all',
                        selectedBarcode === barcode
                          ? 'bg-primary-50 border-2 border-primary-200'
                          : 'bg-lab-bg border-2 border-transparent hover:bg-primary-50/50'
                      )}
                    >
                      <div className="font-mono font-medium text-primary-600">{barcode}</div>
                      <div className="text-xs text-lab-textMuted mt-1">
                        {latest?.sequencingResult.geneName} · {history.length} 个版本
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedBarcode ? (
              <div className="space-y-4">
                <div className="lab-card p-4">
                  <h3 className="font-medium text-lab-text mb-2 flex items-center gap-2">
                    <GitBranch size={18} className="text-primary-500" />
                    谱系追踪 - {selectedBarcode}
                  </h3>
                  <p className="text-sm text-lab-textMuted">
                    展示样本从导入到最终结论的完整血缘关系，包含所有版本变更、人工修正和复核记录
                  </p>
                </div>

                <VersionTimeline
                  versions={getVersionHistory(selectedBarcode)}
                  onSelectVersion={handleSelectVersion}
                />

                {lineageGraph && (
                  <div className="lab-card p-4">
                    <h4 className="font-medium text-lab-text mb-3">版本关系图</h4>
                    <div className="flex flex-wrap gap-3 p-4 bg-lab-bg rounded-lg">
                      {lineageGraph.nodes.map((node, index) => (
                        <div key={node.id} className="flex items-center gap-2">
                          {index > 0 && <ChevronRight size={16} className="text-lab-textMuted" />}
                          <div className={cn(
                            'px-3 py-2 rounded-lg border-2',
                            node.status === 'confirmed'
                              ? 'bg-accent-50 border-accent-200'
                              : node.status === 'reviewing'
                              ? 'bg-warning-50 border-warning-200'
                              : 'bg-white border-lab-border'
                          )}>
                            <div className="font-mono font-bold text-sm text-primary-600">{node.label}</div>
                            <div className="text-xs text-lab-textMuted">
                              {(node.data as SampleVersion).changeReason?.substring(0, 15) || '初始版本'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                      <p className="text-xs text-primary-700">
                        <span className="font-medium">版本关系说明：</span>
                        {lineageGraph.edges.map((edge, i) => (
                          <span key={edge.id}>
                            {i > 0 && ' → '}
                            {edge.label}
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Empty
                title="请选择样本"
                description="从左侧列表选择一个样本条码，查看其完整的谱系追踪信息"
                icon={GitBranch}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="lab-card p-6">
          <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-primary-500" />
            审计日志 - 本月操作记录
          </h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>操作人</th>
                  <th>操作类型</th>
                  <th>目标类型</th>
                  <th>目标ID</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 50).map((log) => {
                  const operator = users.find((u) => u.id === log.operatorId);
                  return (
                    <tr key={log.logId}>
                      <td className="text-xs text-lab-textMuted whitespace-nowrap">
                        {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </td>
                      <td className="flex items-center gap-2">
                        <User size={14} className="text-lab-textMuted" />
                        {operator?.name || log.operatorName || '未知'}
                      </td>
                      <td>
                        <span className="px-2 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-sm">{log.targetType}</td>
                      <td className="font-mono text-xs text-lab-textMuted">{log.targetId.substring(0, 8)}...</td>
                      <td className="text-xs text-lab-textMuted max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
