import { useState } from "react";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { downloadFile, generateReportJSON, generateReportText, generateReportHTML } from "@/utils/reportGenerator";
import { saveToLocalStorage } from "@/utils/dataIO";
import { X, FileJson, FileText, Globe, Database, Download } from "lucide-react";

interface ExportDialogProps {
  onClose: () => void;
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { record } = useAnnotationStore();
  const [saved, setSaved] = useState(false);

  const handleSaveLocal = () => {
    saveToLocalStorage(record);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJSON = () => {
    const json = generateReportJSON(record);
    downloadFile(json, `${record.name || "轨迹记录"}.json`, "application/json");
  };

  const handleExportTXT = () => {
    const txt = generateReportText(record);
    downloadFile(txt, `${record.name || "轨迹记录"}_报告.txt`, "text/plain;charset=utf-8");
  };

  const handleExportHTML = () => {
    const html = generateReportHTML(record);
    downloadFile(html, `${record.name || "轨迹记录"}_报告.html`, "text/html;charset=utf-8");
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">导出数据与报告</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              轨迹：{record.name} · {record.annotations.length} 个标注
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={handleSaveLocal}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-medical-300 hover:bg-medical-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center group-hover:bg-medical-200 transition">
              <Database className="w-5 h-5 text-medical-600" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-neutral-800">保存到本地存储</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                数据保存在浏览器本地，下次可直接导入
              </div>
            </div>
            {saved ? (
              <span className="text-success-600 text-xs font-medium">✓ 已保存</span>
            ) : (
              <span className="text-xs text-neutral-400">→</span>
            )}
          </button>

          <button
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-medical-300 hover:bg-medical-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition">
              <FileJson className="w-5 h-5 text-neutral-700" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-neutral-800">导出 JSON 数据</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                完整结构化数据，可重新导入系统继续编辑
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={handleExportTXT}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-medical-300 hover:bg-medical-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-neutral-200 transition">
              <FileText className="w-5 h-5 text-neutral-700" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-neutral-800">导出 TXT 报告</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                纯文本格式，便于复制粘贴到其他文档
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={handleExportHTML}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-medical-200 hover:border-medical-400 hover:bg-medical-50 transition-all group bg-gradient-to-r from-medical-50/50 to-transparent"
          >
            <div className="w-10 h-10 rounded-lg bg-medical-100 flex items-center justify-center group-hover:bg-medical-200 transition">
              <Globe className="w-5 h-5 text-medical-600" />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-medical-700">导出 HTML 报告（推荐）</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                精美网页报告，含坐标翻转普通话解释，可直接发给教研老师
              </div>
            </div>
            <Download className="w-4 h-4 text-medical-500" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="bg-neutral-50 rounded-lg p-3 text-[11px] text-neutral-500">
            <div className="font-medium text-neutral-600 mb-1">文件命名提示</div>
            默认文件名：{record.name || "轨迹记录"}_{timestamp.slice(0, 10)}.xxx
          </div>
        </div>
      </div>
    </div>
  );
}
