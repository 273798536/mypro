import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, ImageOff, CheckCircle, Upload, Download, RefreshCw, BookOpen, FileSpreadsheet } from 'lucide-react';
import { useRecordPool } from '@/store/recordPool';
import { StatCard } from '@/components/StatCard';
import { FilterPanel } from '@/components/FilterPanel';
import { RecordTable } from '@/components/RecordTable';
import { exportToExcel } from '@/utils/exporter';

export function Dashboard() {
  const {
    isLoaded,
    loadMockData,
    importRecords,
    getStatistics,
    scoreRecords,
    layerRecords,
    processNotes,
  } = useRecordPool();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stats = getStatistics();

  useEffect(() => {
    if (!isLoaded) {
      loadMockData();
    }
  }, [isLoaded, loadMockData]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`已选择文件：${file.name}\n\n演示环境已自动加载示例数据，无需实际导入。`);
      loadMockData();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (scoreRecords.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    exportToExcel(scoreRecords, layerRecords, processNotes);
  };

  const handleRefresh = () => {
    loadMockData();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">康复动作轨迹看板</h1>
                <p className="text-xs text-slate-500">评分表审核 · 异常检测 · 数据追溯</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                导入评分表
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出结果
              </button>
              <Link
                to="/docs"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                使用说明
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="总记录数"
            value={stats.total}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="异常记录"
            value={stats.anomaly}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            title="素材缺失"
            value={stats.materialMissing}
            icon={ImageOff}
            color="yellow"
          />
          <StatCard
            title="已处理"
            value={stats.processed}
            icon={CheckCircle}
            color="green"
          />
        </div>

        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <FilterPanel />
          </aside>
          <div className="flex-1">
            <RecordTable />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <p className="text-xs text-slate-400 text-center">
            康复动作轨迹看板 · 图层管理与命中检测共用同一批处理记录，确保数据一致性
          </p>
        </div>
      </footer>
    </div>
  );
}
