import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchiveStore } from '@/store/useArchiveStore';
import { StatsCard } from '@/components/StatsCard';
import { FilterBar } from '@/components/FilterBar';
import { ArchiveTable } from '@/components/ArchiveTable';
import { cn } from '@/lib/utils';
import { Upload, Database, RefreshCw } from 'lucide-react';
import type { ArchiveRecord } from '@/types';
import { generateId } from '@/data/mockData';

export default function ArchiveList() {
  const { records, filters, loadRecords, setFilters } = useArchiveStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.status !== 'all' && record.status !== filters.status) {
        return false;
      }
      if (filters.anomalyType !== 'all' && record.anomalyType !== filters.anomalyType) {
        return false;
      }
      if (filters.dateRange.start) {
        const recordDate = record.runTimestamp.slice(0, 10);
        if (recordDate < filters.dateRange.start) return false;
      }
      if (filters.dateRange.end) {
        const recordDate = record.runTimestamp.slice(0, 10);
        if (recordDate > filters.dateRange.end) return false;
      }
      return true;
    });
  }, [records, filters]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const text = await file.text();
      let newRecords: ArchiveRecord[];

      if (file.name.endsWith('.json')) {
        newRecords = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter((l) => l.trim());
        newRecords = lines.slice(1).map((line, idx) => {
          const values = line.split(',');
          const now = new Date().toISOString();
          return {
            id: generateId('rec'),
            batchNumber: `BATCH-IMPORT-${Date.now()}-${String(idx + 1).padStart(3, '0')}`,
            runTimestamp: now,
            tableName: values[0] || `imported_table_${idx}`,
            status: 'pending' as const,
            anomalyType: 'none' as const,
            expectedCount: parseInt(values[1] || '0'),
            actualCount: parseInt(values[2] || '0'),
            pageSequence: [1],
            pageSequenceValid: true,
            createdAt: now,
            updatedAt: now,
            source: [],
            backupGaps: [],
            processingNotes: [],
            slowQueryLogs: [],
            auditLogs: [
              {
                id: generateId('audit'),
                action: 'IMPORT',
                operator: 'DBA-CurrentUser',
                timestamp: now,
                detail: `从文件 ${file.name} 导入`,
              },
            ],
            exportBatches: [],
          };
        });
      } else {
        alert('仅支持 CSV 和 JSON 格式');
        return;
      }

      const { records: currentRecords } = useArchiveStore.getState();
      useArchiveStore.setState({ records: [...currentRecords, ...newRecords] });
      localStorage.setItem(
        'cold_hot_archive_records',
        JSON.stringify([...useArchiveStore.getState().records])
      );

      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败，请检查文件格式');
      setImporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      anomalyType: 'all',
      dateRange: { start: '', end: '' },
    });
  };

  const handleRefresh = () => {
    localStorage.removeItem('cold_hot_archive_records');
    loadRecords();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">冷热数据归档助手</h1>
                <p className="text-xs text-slate-500">Cold & Hot Archive Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleRefresh}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                  'border border-slate-200 rounded-md text-slate-700',
                  'hover:bg-slate-50 transition-colors'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                重置数据
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                  'bg-slate-900 text-white rounded-md',
                  'hover:bg-slate-800 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Upload className="w-4 h-4" />
                {importing ? '导入中...' : '导入数据'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <StatsCard records={records} />
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              共 <span className="font-mono font-medium text-slate-700">{filteredRecords.length}</span> 条记录
              {filteredRecords.length !== records.length && (
                <span className="ml-1">（已筛选）</span>
              )}
            </p>
          </div>
          <ArchiveTable records={filteredRecords} />
        </div>
      </main>
    </div>
  );
}
