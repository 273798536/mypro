import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileDown, Search, GitCompare, Trash2, Sparkles } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import FilterSidebar from '@/components/FilterSidebar';
import DataTable from '@/components/DataTable';
import ImportDialog from '@/components/ImportDialog';

export default function Home() {
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const {
    records,
    selectedIds,
    filters,
    exportToCSV,
    deleteRecords,
    loadSampleData,
    detectDuplicates,
  } = useLedgerStore();

  const handleExportSelected = () => {
    const toExport = selectedIds.length > 0
      ? records.filter((r) => selectedIds.includes(r.id))
      : records;
    const csv = exportToCSV(toExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `物化视图刷新台账_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDetectAndReview = () => {
    detectDuplicates();
    navigate('/review');
  };

  const totalAnomalies = records.filter((r) => r.anomaly_type !== 'normal').length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const backupGapCount = records.filter((r) => r.anomaly_type === 'backup_gap').length;

  return (
    <div className="flex h-[calc(100vh-73px)]">
      <FilterSidebar />

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索视图名称、来源表、结论..."
                  value={filters.viewNameKeyword}
                  onChange={(e) =>
                    useLedgerStore.getState().setFilters({ viewNameKeyword: e.target.value })
                  }
                  className="input-field w-full pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {records.length === 0 && (
                <button
                  onClick={loadSampleData}
                  className="btn flex items-center gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Sparkles className="w-4 h-4" />
                  加载示例
                </button>
              )}
              <button
                onClick={() => setImportOpen(true)}
                className="btn-primary flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                导入台账
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`确认删除选中的 ${selectedIds.length} 条记录？`)) {
                      deleteRecords(selectedIds);
                    }
                  }}
                  className="btn-danger flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  删除({selectedIds.length})
                </button>
              )}
              <button
                onClick={handleDetectAndReview}
                disabled={records.length < 2}
                className="btn flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitCompare className="w-4 h-4" />
                复核去重
              </button>
              <button
                onClick={handleExportSelected}
                disabled={records.length === 0}
                className="btn flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-4 h-4" />
                {selectedIds.length > 0 ? `导出选中(${selectedIds.length})` : '导出全部'}
              </button>
            </div>
          </div>
        </div>

        {records.length > 0 && (
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-slate-400 rounded-full" />
              <span className="text-slate-600">
                总记录 <strong className="text-brand">{records.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-slate-600">
                异常 <strong className="text-amber-700">{totalAnomalies}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-600 rounded-full" />
              <span className="text-slate-600">
                备份缺口 <strong className="text-amber-800">{backupGapCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-slate-500 rounded-full" />
              <span className="text-slate-600">
                待处理 <strong className="text-brand">{pendingCount}</strong>
              </span>
            </div>
          </div>
        )}

        <DataTable />
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
