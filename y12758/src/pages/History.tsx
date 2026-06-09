import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import { exportToCSV, exportBatchesToCSV, downloadCSV } from '@/utils/exportUtils';
import type { CheckResult, ExperimentBatch } from '@/types';

type StatusFilter = 'all' | 'PASS' | 'FAIL' | 'PENDING';

interface BatchWithResult {
  batch: ExperimentBatch;
  result: CheckResult | undefined;
}

export default function History() {
  const navigate = useNavigate();
  const batches = useStore((s) => s.batches);
  const checkResults = useStore((s) => s.checkResults);
  const setCurrentBatch = useStore((s) => s.setCurrentBatch);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const batchesWithResults: BatchWithResult[] = useMemo(() => {
    return batches.map((batch) => ({
      batch,
      result: checkResults[batch.batchId],
    }));
  }, [batches, checkResults]);

  const stats = useMemo(() => {
    let total = batchesWithResults.length;
    let pass = 0;
    let fail = 0;
    let pending = 0;

    for (const { result } of batchesWithResults) {
      if (result?.overallStatus === 'PASS') pass++;
      else if (result?.overallStatus === 'FAIL') fail++;
      else if (!result || result.overallStatus === 'PENDING') pending++;
    }

    return { total, pass, fail, pending };
  }, [batchesWithResults]);

  const filteredBatches = useMemo(() => {
    return batchesWithResults.filter(({ batch, result }) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !batch.batchId.toLowerCase().includes(q) &&
          !batch.sampleName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if (statusFilter !== 'all') {
        const currentStatus = result?.overallStatus ?? 'PENDING';
        if (currentStatus !== statusFilter) {
          return false;
        }
      }

      if (startDate && batch.recordDate < startDate) {
        return false;
      }
      if (endDate && batch.recordDate > endDate) {
        return false;
      }

      return true;
    });
  }, [batchesWithResults, searchQuery, statusFilter, startDate, endDate]);

  const allSelected =
    filteredBatches.length > 0 &&
    filteredBatches.every(({ batch }) => selectedIds.has(batch.batchId));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBatches.map(({ batch }) => batch.batchId)));
    }
  };

  const toggleSelect = (batchId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handleView = (batchId: string) => {
    setCurrentBatch(batchId);
    navigate('/results');
  };

  const handleExportSingle = (item: BatchWithResult) => {
    if (!item.result) return;
    const csv = exportToCSV(item.result, item.batch);
    const filename = `${item.batch.batchId}_${item.batch.sampleName || 'export'}.csv`;
    downloadCSV(csv, filename);
  };

  const handleBatchExport = () => {
    const items = filteredBatches
      .filter(({ batch, result }) => selectedIds.has(batch.batchId) && result)
      .map(({ batch, result }) => ({
        checkResult: result as CheckResult,
        batch,
      }));

    if (items.length === 0) return;

    const csv = exportBatchesToCSV(items);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `批量导出_${timestamp}.csv`);
  };

  const getOverallStatus = (result: CheckResult | undefined): 'PASS' | 'FAIL' | 'PENDING' => {
    return result?.overallStatus ?? 'PENDING';
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-ink">历史记录与导出</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-ink-muted">总批次数</div>
          <div className="text-3xl font-bold text-ink mt-1">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-muted">通过批次数</div>
          <div className="text-3xl font-bold text-pass mt-1">{stats.pass}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-muted">超限批次数</div>
          <div className="text-3xl font-bold text-fail mt-1">{stats.fail}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-ink-muted">待复测批次数</div>
          <div className="text-3xl font-bold text-warn mt-1">{stats.pending}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink-muted mb-1">
              批次号/样品名搜索
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入批次号或样品名称..."
              className="w-full px-3 py-2 border border-ink-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-sm font-medium text-ink-muted mb-1">状态筛选</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-ink-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            >
              <option value="all">全部</option>
              <option value="PASS">通过</option>
              <option value="FAIL">超限</option>
              <option value="PENDING">待复测</option>
            </select>
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-sm font-medium text-ink-muted mb-1">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-ink-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="w-full lg:w-40">
            <label className="block text-sm font-medium text-ink-muted mb-1">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-ink-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {selectedIds.size > 0 && (
          <div className="px-4 py-3 bg-primary/5 border-b border-ink-light flex items-center justify-between">
            <span className="text-sm text-ink">
              已选择 <span className="font-semibold text-primary">{selectedIds.size}</span> 项
            </span>
            <button
              onClick={handleBatchExport}
              className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              批量导出
            </button>
          </div>
        )}

        {filteredBatches.length === 0 ? (
          <div className="py-16 text-center text-ink-muted">
            <p className="text-lg">暂无历史记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-light bg-ink-light/30">
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-ink-light text-primary focus:ring-primary/30"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">批次号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">样品名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">总体结论</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">杂质数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">复测建议</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-muted">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(({ batch, result }) => {
                  const isSelected = selectedIds.has(batch.batchId);
                  const impurityCount = result?.impurityResults.length ?? batch.impurities.length;
                  const hasRetestAdvice = Boolean(result?.retestAdvice);

                  return (
                    <tr
                      key={batch.batchId}
                      className={`border-b border-ink-light/50 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-ink-light/30'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(batch.batchId)}
                          className="w-4 h-4 rounded border-ink-light text-primary focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-ink font-mono">{batch.batchId}</td>
                      <td className="px-4 py-3 text-sm text-ink">{batch.sampleName}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{batch.recordDate}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getOverallStatus(result)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">{impurityCount}</td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {hasRetestAdvice ? (
                          <span className="text-pass font-semibold">✓</span>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(batch.batchId)}
                            className="px-3 py-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => handleExportSingle({ batch, result })}
                            disabled={!result}
                            className="px-3 py-1 text-sm text-ink-muted hover:text-ink font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            导出
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
