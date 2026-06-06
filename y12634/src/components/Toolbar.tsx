import { FileText, Download, RefreshCw, FileJson, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportCsv, exportJson } from '@/utils/exportData';
import { useProductionStore } from '@/store/productionStore';

export function Toolbar() {
  const navigate = useNavigate();
  const { productionData, rerunHitDetection } = useProductionStore();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-950/90 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#A7F3D0] to-[#0F2F3C] flex items-center justify-center">
          <span className="text-[#0F2F3C] text-sm font-bold" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            节
          </span>
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-100 tracking-wide" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            生产线节拍泳道图
          </h1>
          <p className="text-[11px] text-slate-400">
            图表 · 明细 · 下载结果均来自同一批数据
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => rerunHitDetection()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重跑命中检测
        </button>
        <button
          onClick={() => exportCsv(productionData)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          导出 CSV
        </button>
        <button
          onClick={() => exportJson(productionData)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
        >
          <FileJson className="w-3.5 h-3.5" />
          导出 JSON
        </button>
        <button
          onClick={() => navigate('/report')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition"
        >
          <FileText className="w-3.5 h-3.5" />
          生成复核报告
          <Download className="w-3 h-3 ml-0.5" />
        </button>
      </div>
    </header>
  );
}
