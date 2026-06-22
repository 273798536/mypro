import { useEffect, useState } from 'react';
import { Search, Clock, User, GitCompare, X } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table, { TableColumn } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Select, { SelectOption } from '@/components/ui/Select';
import { useBatchStore } from '@/store/useBatchStore';
import { useRecordStore } from '@/store/useRecordStore';
import { useRuleStore } from '@/store/useRuleStore';
import type { Batch, RecordVersion, ProcessHistory, ReviewRecord } from '@/types';

const statusOptions: SelectOption[] = [
  { value: 'all', label: '全部状态' },
  { value: 'new', label: '新增' },
  { value: 'skipped', label: '跳过' },
  { value: 'normal', label: '正常' },
  { value: 'anomaly', label: '异常' },
];

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface BatchWithVersions extends Batch {
  versionCount: number;
}

export default function RecordsArchivePage() {
  const {
    initMock: initBatchMock,
    batches,
    getBatchHistory,
    setCurrentBatch,
  } = useBatchStore();
  const {
    initMock: initRecordMock,
    records,
    getRecordsByBatch,
    switchVersion,
  } = useRecordStore();
  const { initMock: initRuleMock } = useRuleStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versionDrawerBatch, setVersionDrawerBatch] = useState<BatchWithVersions | null>(null);

  useEffect(() => {
    initBatchMock();
    initRecordMock();
    initRuleMock();
  }, [initBatchMock, initRecordMock, initRuleMock]);

  const batchesWithVersions: BatchWithVersions[] = batches.map((b) => {
    const batchRecords = records.filter((r) => r.batchId === b.id);
    const versionCount = batchRecords.reduce((sum, r) => sum + r.versions.length, 0);
    return { ...b, versionCount };
  });

  const filteredBatches = batchesWithVersions.filter((b) => {
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all') {
      const batchRecords = getRecordsByBatch(b.id);
      const hasStatus = batchRecords.some((r) => r.status === statusFilter);
      if (!hasStatus) return false;
    }
    if (dateFrom) {
      if (new Date(b.createdAt) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (new Date(b.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const handleRowClick = (batch: BatchWithVersions) => {
    setExpandedBatchId((prev) => (prev === batch.id ? null : batch.id));
    setCurrentBatch(batch.id);
  };

  const openVersionDrawer = (batch: BatchWithVersions) => {
    setVersionDrawerBatch(batch);
    setVersionDrawerOpen(true);
    setCurrentBatch(batch.id);
  };

  const getStatusBadge = (status: Batch['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="normal">completed</Badge>;
      case 'running':
        return <Badge variant="info">running</Badge>;
      case 'pending':
        return <Badge variant="skipped">pending</Badge>;
      case 'failed':
        return <Badge variant="anomaly">failed</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getAllVersionsForBatch = (batchId: string): (RecordVersion & { recordKey: string })[] => {
    const batchRecords = getRecordsByBatch(batchId);
    const versions: (RecordVersion & { recordKey: string })[] = [];
    batchRecords.forEach((r) => {
      r.versions.forEach((v) => {
        versions.push({ ...v, recordKey: r.recordKey || r.recordNo || r.id });
      });
    });
    return versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const batchColumns: TableColumn<BatchWithVersions>[] = [
    { key: 'name', header: '批次名称', width: '28%' },
    {
      key: 'status',
      header: '状态',
      width: '10%',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'totalRecords',
      header: '总记录',
      align: 'right',
      width: '8%',
      render: (row) => <span className="font-mono">{row.totalRecords}</span>,
    },
    {
      key: 'newRecords',
      header: '新增',
      align: 'right',
      width: '7%',
      render: (row) => (
        <span className="font-mono text-ink-700">{row.newRecords ?? row.newCount ?? 0}</span>
      ),
    },
    {
      key: 'skippedRecords',
      header: '跳过',
      align: 'right',
      width: '7%',
      render: (row) => (
        <span className="font-mono text-parchment-700">
          {row.skippedRecords ?? row.skippedCount ?? 0}
        </span>
      ),
    },
    {
      key: 'anomalyRecords',
      header: '异常',
      align: 'right',
      width: '7%',
      render: (row) => (
        <span className="font-mono text-vermilion-700">
          {row.anomalyRecords ?? row.anomalyCount ?? 0}
        </span>
      ),
    },
    {
      key: 'versionCount',
      header: '版本数',
      align: 'center',
      width: '10%',
      render: (row) => (
        <Badge variant="info" className="font-mono">v{row.versionCount}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      width: '15%',
      render: (row) => <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      width: '8%',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRowClick(row)}
          >
            查看详情
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openVersionDrawer(row)}
          >
            查看版本
          </Button>
        </div>
      ),
    },
  ];

  const recordColumns: TableColumn<ReviewRecord>[] = [
    {
      key: 'recordKey',
      header: '记录编号',
      width: '20%',
      render: (row) => (
        <span className="font-mono text-ink-700">{row.recordKey || row.recordNo || row.id}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      width: '10%',
      render: (row) => {
        const variant = (row.status === 'approved' ? 'normal' : row.status) as 'new' | 'skipped' | 'normal' | 'anomaly' | 'info';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    { key: 'sourceFile', header: '来源文件', width: '35%' },
    {
      key: 'versionCount',
      header: '版本数',
      align: 'right',
      width: '10%',
      render: (row) => (
        <span className="font-mono">{row.versions.length}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '创建时间',
      width: '25%',
      render: (row) => <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>,
    },
  ];

  const batchHistory: ProcessHistory[] = expandedBatchId
    ? getBatchHistory(expandedBatchId)
    : [];

  const expandedBatchRecords: ReviewRecord[] = expandedBatchId
    ? getRecordsByBatch(expandedBatchId)
    : [];

  const drawerVersions = versionDrawerBatch
    ? getAllVersionsForBatch(versionDrawerBatch.id)
    : [];

  return (
    <PageContainer
      title="记录档案"
      subtitle="批次列表 · 版本回溯 · 处理历史"
    >
      <div className="space-y-6">
        <Card>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[240px]">
                <Input
                  label="搜索批次"
                  placeholder="输入批次名称搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-[160px]">
                <Select
                  label="状态筛选"
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div className="w-[160px]">
                <Input
                  label="开始日期"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="w-[160px]">
                <Input
                  label="结束日期"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <Table
            columns={batchColumns}
            data={filteredBatches}
            rowKey="id"
            onRowClick={(row) => handleRowClick(row as BatchWithVersions)}
          />

          {expandedBatchId && (
            <div className="border-t border-parchment-200 bg-parchment-50/50">
              <div className="px-6 py-4 border-b border-parchment-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-base font-semibold text-ink-700">
                    批次记录详情 - {batches.find((b) => b.id === expandedBatchId)?.name}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openVersionDrawer(
                      batchesWithVersions.find((b) => b.id === expandedBatchId)!
                    )}
                  >
                    查看版本历史
                  </Button>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-parchment-200">
                <p className="text-sm font-medium text-ink-700 mb-3 font-serif">记录列表</p>
                <Table
                  columns={recordColumns}
                  data={expandedBatchRecords}
                  rowKey="id"
                />
              </div>

              <div className="px-6 py-4">
                <p className="text-sm font-medium text-ink-700 mb-4 font-serif">处理历史</p>
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-parchment-200" />
                  {batchHistory.length === 0 ? (
                    <p className="text-sm text-charcoal-500 font-mono pl-10">暂无处理历史</p>
                  ) : (
                    <div className="space-y-4">
                      {batchHistory.map((hist) => (
                        <div key={hist.id} className="relative flex gap-4 pl-10">
                          <div className="absolute left-2 top-1 w-5 h-5 bg-white border-2 border-ink-400 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-ink-600 rounded-full" />
                          </div>
                          <div className="flex-1 bg-white border border-parchment-200 rounded-md p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <Badge variant="info" className="font-mono text-xs">
                                    {hist.action}
                                  </Badge>
                                  <span className="flex items-center gap-1 text-xs text-charcoal-500 font-mono">
                                    <User className="w-3 h-3" />
                                    {hist.operator}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-charcoal-500 font-mono">
                                    <Clock className="w-3 h-3" />
                                    {formatDateTime(hist.timestamp || hist.createdAt || '')}
                                  </span>
                                </div>
                                <p className="text-sm text-ink-700 font-mono">
                                  {hist.summary || hist.details}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          versionDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => setVersionDrawerOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-[320px] bg-white border-l border-parchment-200 shadow-xl transition-transform duration-300 ${
            versionDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-parchment-200 bg-parchment-50/50">
            <div>
              <h3 className="font-serif text-lg font-semibold text-ink-700">版本历史</h3>
              {versionDrawerBatch && (
                <p className="text-xs text-charcoal-500 font-mono mt-0.5">
                  {versionDrawerBatch.name}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              onClick={() => setVersionDrawerOpen(false)}
            />
          </div>

          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]">
            {drawerVersions.length === 0 ? (
              <p className="text-sm text-charcoal-500 font-mono text-center py-8">
                暂无版本记录
              </p>
            ) : (
              drawerVersions.map((version) => (
                <Card key={version.id}>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="info" className="font-mono font-semibold">
                        v{version.versionNumber || version.version || 1}
                      </Badge>
                      <span className="text-xs text-charcoal-500 font-mono">
                        {formatDateTime(version.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-charcoal-600 font-mono">
                        <User className="w-3 h-3" />
                        <span>{version.createdBy || '系统'}</span>
                      </div>

                      {version.recordKey && (
                        <div className="flex items-center gap-1.5 text-xs text-charcoal-600 font-mono">
                          <GitCompare className="w-3 h-3" />
                          <span>记录: {version.recordKey}</span>
                        </div>
                      )}

                      {version.data && Object.keys(version.data).length > 0 && (
                        <div className="bg-parchment-50 rounded px-3 py-2">
                          <p className="text-xs text-charcoal-500 font-mono mb-1">数据差异:</p>
                          <div className="space-y-0.5">
                            {Object.entries(version.data).slice(0, 4).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs font-mono">
                                <span className="text-charcoal-500">{k}:</span>
                                <span className="text-ink-700">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {version.overwriteReason && (
                        <p className="text-xs text-charcoal-400 italic font-mono">
                          {version.overwriteReason}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (version.recordId) {
                          switchVersion(version.recordId, version.id);
                        }
                      }}
                    >
                      切换到此版本
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
