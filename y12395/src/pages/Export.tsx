import { useState } from "react";
import { FileDown, FileText, Table, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useStore } from "@/store";

export default function Export() {
  const { exportData, exportLoading, runExport } = useStore();
  const [includeMapping, setIncludeMapping] = useState(true);
  const [includeDiff, setIncludeDiff] = useState(true);
  const [mappingExpanded, setMappingExpanded] = useState(true);
  const [diffExpanded, setDiffExpanded] = useState(true);

  const handleGenerate = () => {
    runExport({ includeMapping, includeDiff });
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([exportData.report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `古琴指法谱系报告_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-mohei">证据导出</h2>
        <p className="text-sm text-gray-500 font-serif mt-1">
          生成谱系对应关系报告与差异对照
        </p>
      </div>

      <div className="bg-white rounded-md shadow-warm p-6 mb-6">
        <h3 className="font-serif font-semibold text-mohei mb-4">报告配置</h3>
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeMapping}
              onChange={(e) => setIncludeMapping(e.target.checked)}
              className="w-4 h-4 rounded border-gutong/30 text-gutong focus:ring-gutong accent-gutong"
            />
            <div className="flex items-center gap-2">
              <Table size={16} className="text-gutong" />
              <span className="font-serif text-sm text-mohei group-hover:text-gutong transition-colors">
                包含对应关系映射表
              </span>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeDiff}
              onChange={(e) => setIncludeDiff(e.target.checked)}
              className="w-4 h-4 rounded border-gutong/30 text-gutong focus:ring-gutong accent-gutong"
            />
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-dianlan" />
              <span className="font-serif text-sm text-mohei group-hover:text-gutong transition-colors">
                包含变更差异记录
              </span>
            </div>
          </label>
        </div>
        <button
          onClick={handleGenerate}
          disabled={exportLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-gutong text-white hover:bg-gutong/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-serif text-sm"
        >
          <FileDown size={16} />
          生成报告
        </button>
      </div>

      {exportData && (
        <div className="space-y-4">
          <div className="bg-white rounded-md shadow-warm p-6">
            <h3 className="font-serif font-semibold text-mohei text-lg mb-4">报告预览</h3>
            <div className="bg-xuanzhi rounded-md p-6 border border-gutong/10">
              <pre className="text-sm font-serif text-mohei leading-relaxed whitespace-pre-wrap">
                {exportData.report}
              </pre>
            </div>
          </div>

          {includeMapping && exportData.mappings.length > 0 && (
            <div className="bg-white rounded-md shadow-warm">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setMappingExpanded(!mappingExpanded)}
              >
                <h4 className="font-serif font-semibold text-mohei flex items-center gap-2">
                  <Table size={16} className="text-gutong" />
                  对应关系
                </h4>
                {mappingExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
              {mappingExpanded && (
                <div className="px-6 pb-5">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gutong/10">
                        <th className="text-left py-2 text-xs text-gray-500 font-serif font-semibold">琴谱</th>
                        <th className="text-center py-2 text-xs text-gray-400">↔</th>
                        <th className="text-left py-2 text-xs text-gray-500 font-serif font-semibold">注疏</th>
                        <th className="text-center py-2 text-xs text-gray-400">↔</th>
                        <th className="text-left py-2 text-xs text-gray-500 font-serif font-semibold">报告</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportData.mappings.map((mapping, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-2 text-sm font-serif text-mohei">{mapping.score}</td>
                          <td className="py-2 text-center text-gutong">—</td>
                          <td className="py-2 text-sm font-serif text-mohei">{mapping.annotation}</td>
                          <td className="py-2 text-center text-gutong">—</td>
                          <td className="py-2 text-sm font-serif text-mohei">{mapping.report}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {includeDiff && exportData.diffSnapshots.length > 0 && (
            <div className="bg-white rounded-md shadow-warm">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setDiffExpanded(!diffExpanded)}
              >
                <h4 className="font-serif font-semibold text-mohei flex items-center gap-2">
                  <FileText size={16} className="text-dianlan" />
                  变更差异记录
                </h4>
                {diffExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
              {diffExpanded && (
                <div className="px-6 pb-5 space-y-3">
                  {exportData.diffSnapshots.map((snap, i) => (
                    <div
                      key={i}
                      className="bg-xuanzhi/60 rounded-md p-4 border border-gutong/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-serif text-gray-400">
                          {String(snap.created_at || "")}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dianlan/10 text-dianlan font-serif">
                          {String(snap.entity_type || "")}.{String(snap.field || "")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-zhusha font-serif mb-1">修改前</p>
                          <p className="text-sm font-serif text-mohei bg-zhusha/5 px-3 py-2 rounded line-through">
                            {String(snap.old_value || "")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dianlan font-serif mb-1">修改后</p>
                          <p className="text-sm font-serif text-mohei bg-dianlan/5 px-3 py-2 rounded underline decoration-dianlan">
                            {String(snap.new_value || "")}
                          </p>
                        </div>
                      </div>
                      {snap.reason && (
                        <p className="text-xs font-serif text-gray-500 mt-2">
                          原因：{String(snap.reason)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-gutong text-gutong hover:bg-gutong/10 transition-all duration-200 font-serif text-sm"
            >
              <Download size={16} />
              导出
            </button>
          </div>
        </div>
      )}

      {!exportData && !exportLoading && (
        <div className="text-center py-16">
          <FileDown size={48} className="mx-auto text-gutong/30 mb-4" />
          <p className="text-gray-400 font-serif">配置报告选项后点击"生成报告"</p>
        </div>
      )}

      {exportLoading && (
        <div className="text-center py-16 text-gray-400 font-serif">
          报告生成中...
        </div>
      )}
    </div>
  );
}
