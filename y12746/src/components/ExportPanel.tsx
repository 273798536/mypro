import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useVolumeStore } from "@/store/useVolumeStore";
import { batchToCSV, batchToJSON, triggerDownload } from "@/utils/exportData";

export default function ExportPanel() {
  const { currentBatch } = useVolumeStore();
  const materials = currentBatch.materials;

  const csvContent = batchToCSV(currentBatch);
  const jsonContent = batchToJSON(currentBatch);
  const csvSize = new Blob([csvContent]).size;
  const jsonSize = new Blob([jsonContent]).size;

  const timestamp = new Date().toISOString().slice(0, 10);

  const handleCSV = () => {
    triggerDownload(
      csvContent,
      `${currentBatch.id}_体积近似_${timestamp}.csv`,
      "text/csv;charset=utf-8"
    );
  };
  const handleJSON = () => {
    triggerDownload(
      jsonContent,
      `${currentBatch.id}_体积近似_${timestamp}.json`,
      "application/json;charset=utf-8"
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card p-5 animate-fadeUp" style={{ animationDelay: "480ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-4 h-4 text-mist-500" />
        <h3 className="serif text-base font-semibold text-ink-800">结果下载（与图表、明细同源）</h3>
      </div>
      <p className="serif text-xs text-ink-500 mb-4 leading-relaxed">
        以下文件与当前看板展示的<strong className="text-ink-700">{materials.length}</strong> 条材料、异常、约束校验结果完全同源，包含边界样例标注与草稿缺口标记。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleCSV}
          className="flex items-center gap-3 p-3 bg-ink-50 hover:bg-mist-50 border border-ink-100 hover:border-mist-200 rounded-md transition-all group"
        >
          <div className="w-10 h-10 rounded bg-mist-100 flex items-center justify-center group-hover:bg-mist-200 transition-colors">
            <FileSpreadsheet className="w-5 h-5 text-mist-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="serif text-sm text-ink-800 font-medium">CSV 表格</div>
            <div className="mono text-[11px] text-ink-400">适合 Excel / WPS · {(csvSize / 1024).toFixed(1)} KB</div>
          </div>
        </button>
        <button
          onClick={handleJSON}
          className="flex items-center gap-3 p-3 bg-ink-50 hover:bg-amber-50 border border-ink-100 hover:border-amber-200 rounded-md transition-all group"
        >
          <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
            <FileJson className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="serif text-sm text-ink-800 font-medium">JSON 完整包</div>
            <div className="mono text-[11px] text-ink-400">含异常、约束、草稿 · {(jsonSize / 1024).toFixed(1)} KB</div>
          </div>
        </button>
      </div>
    </div>
  );
}
