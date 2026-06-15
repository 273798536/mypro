import { Download, Filter, MapPin } from 'lucide-react';
import { usePointStore } from '@/store/usePointStore';
import { exportToCSV, downloadCSV } from '@/utils/csvExport';
import { useState } from 'react';

export default function Header() {
  const { points, dataSources, getFilteredPoints } = usePointStore();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    const filteredPoints = getFilteredPoints();
    const csv = exportToCSV(filteredPoints, dataSources);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(`老街消防容量复核明细_${date}.csv`, csv);
    setTimeout(() => setExporting(false), 1000);
  };

  return (
    <header className="bg-slate-800 text-white border-b border-slate-700">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">老街消防容量复核</h1>
            <p className="text-xs text-slate-400">多源数据合并 · 来源追溯 · 异常高亮</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Filter className="w-4 h-4" />
            <span>共 {points.length} 个点位</span>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? '导出中...' : '导出CSV明细'}
          </button>
        </div>
      </div>
    </header>
  );
}
