import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Info } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { DataTable } from '../components/DataTable';
import { ActionBar } from '../components/ActionBar';
import { mockMatchRecords } from '../data/mockData';
import { MatchRecord, FilterConditions } from '../types';
import { exportToCSV } from '../utils/export';

const STORAGE_KEY = 'subsidy-match-records';

const defaultFilters: FilterConditions = {
  projectName: '',
  batchNo: '',
  matchStatus: '',
  riskType: '',
  dateRange: null
};

export function Home() {
  const [records, setRecords] = useState<MatchRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : mockMatchRecords;
    } catch {
      return mockMatchRecords;
    }
  });

  const [filters, setFilters] = useState<FilterConditions>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filters.projectName && !record.project.projectName.includes(filters.projectName)) {
        return false;
      }
      if (filters.batchNo && !record.batch.batchNo.includes(filters.batchNo)) {
        return false;
      }
      if (filters.matchStatus && record.matchStatus !== filters.matchStatus) {
        return false;
      }
      if (filters.riskType) {
        if (filters.riskType === 'none') {
          if (record.risks.length > 0) return false;
        } else {
          if (!record.risks.some(r => r.riskType === filters.riskType)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [records, filters]);

  const handleSelect = (recordId: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(filteredRecords.map(r => r.recordId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleConfirmSingle = async (recordId: string) => {
    setConfirmingId(recordId);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setRecords(prev => prev.map(record => {
      if (record.recordId === recordId) {
        return {
          ...record,
          matchStatus: 'confirmed' as const,
          confirmedBy: '当前用户',
          confirmedAt: new Date().toLocaleString('zh-CN')
        };
      }
      return record;
    }));
    
    setConfirmingId(null);
  };

  const handleBatchConfirm = async () => {
    setIsBatchConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setRecords(prev => prev.map(record => {
      if (selectedIds.has(record.recordId)) {
        return {
          ...record,
          matchStatus: 'confirmed' as const,
          confirmedBy: '当前用户',
          confirmedAt: new Date().toLocaleString('zh-CN')
        };
      }
      return record;
    }));
    
    setSelectedIds(new Set());
    setIsBatchConfirming(false);
  };

  const handleExportSelected = () => {
    const selectedRecords = records.filter(r => selectedIds.has(r.recordId));
    exportToCSV(selectedRecords, '新能源补贴到账核对_选中.csv');
  };

  const handleExportAll = () => {
    exportToCSV(filteredRecords, '新能源补贴到账核对_全部.csv');
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const hasRiskRecords = records.filter(r => r.risks.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">新能源补贴到账核对</h1>
                <p className="text-xs text-slate-400">匹配确认 · 风险追踪 · 数据追溯</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Info className="w-4 h-4" />
                <span>数据已自动保存至本地</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{records.length}</div>
            <div className="text-sm text-slate-400">总记录数</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">
              {records.filter(r => r.matchStatus === 'confirmed').length}
            </div>
            <div className="text-sm text-slate-400">已确认</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {records.filter(r => r.matchStatus === 'matched').length}
            </div>
            <div className="text-sm text-slate-400">待确认</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-400">{hasRiskRecords}</div>
            <div className="text-sm text-slate-400">存在风险</div>
          </div>
        </div>

        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-6">
          <div className="text-sm font-medium text-slate-300 mb-2">风险类型说明</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-slate-400">批次延迟：到账时间晚于约定时间</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-slate-400">发票红冲：原发票已作废重开</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              <span className="text-slate-400">项目合并：多个项目合并申报</span>
            </div>
          </div>
        </div>

        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
        />

        <DataTable
          records={filteredRecords}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onConfirmSingle={handleConfirmSingle}
          confirmingId={confirmingId}
        />

        <ActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredRecords.length}
          onConfirm={handleBatchConfirm}
          onExport={handleExportSelected}
          onExportAll={handleExportAll}
          isConfirming={isBatchConfirming}
        />
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          新能源财务补贴核对系统 · 数据仅存储于本地浏览器
        </div>
      </footer>
    </div>
  );
}

export default Home;
