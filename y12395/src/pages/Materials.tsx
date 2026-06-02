import { useEffect, useState } from "react";
import { Music, PenTool, StickyNote, Plus, ChevronDown, ChevronUp, FileText, Link2, Layers } from "lucide-react";
import { useStore, SourceMaterial } from "@/store";

const typeIcons: Record<SourceMaterial["type"], typeof Music> = {
  score: Music,
  annotation: PenTool,
  note: StickyNote,
};

const typeLabels: Record<SourceMaterial["type"], string> = {
  score: "琴谱",
  annotation: "注疏",
  note: "笔记",
};

function MaterialCard({ material, onTrace }: { material: SourceMaterial; onTrace: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[material.type];

  return (
    <div className="bg-white rounded-md shadow-warm transition-all duration-200 hover:shadow-warm-md">
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gutong/10 flex items-center justify-center">
              <Icon size={20} className="text-gutong" />
            </div>
            <div>
              <h3 className="font-serif text-mohei font-semibold text-base">
                {material.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dianlan/10 text-dianlan font-serif">
                  {material.version}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gutong/10 text-gutong font-serif">
                  {typeLabels[material.type]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-xs font-serif">{material.sourceFile}</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gutong/10">
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2">
              <FileText size={16} className="text-gutong mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-serif">来源文件</p>
                <p className="text-sm text-mohei font-serif">{material.sourceFile}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Link2 size={16} className="text-dianlan mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-serif">关联注疏</p>
                <p className="text-sm text-mohei font-serif">
                  {material.relatedAnnotations.length > 0
                    ? material.relatedAnnotations.join("、")
                    : "点击溯源查看"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Layers size={16} className="text-gutong mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-serif">关联版本</p>
                <p className="text-sm text-mohei font-serif">
                  {material.relatedVersions.length > 0
                    ? material.relatedVersions.join("、")
                    : "点击溯源查看"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-xuanzhi rounded-md">
            <p className="text-xs text-gray-500 font-serif mb-1">内容预览</p>
            <p className="text-sm text-mohei font-serif leading-relaxed whitespace-pre-wrap line-clamp-6">
              {material.content}
            </p>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrace(material.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dianlan/30 text-dianlan hover:bg-dianlan/10 transition-all duration-200 font-serif text-xs"
            >
              <Layers size={12} />
              溯源
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Materials() {
  const { materials, materialsLoading, fetchMaterials, addMaterial, fetchMaterialDetail } = useStore();
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState({
    title: "",
    type: "score" as SourceMaterial["type"],
    version: "",
    content: "",
    sourceFile: "",
  });
  const [traceResult, setTraceResult] = useState<Record<string, unknown> | null>(null);
  const [traceVisible, setTraceVisible] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleImport = async () => {
    if (!importForm.title || !importForm.content) return;
    await addMaterial(importForm);
    setImportForm({ title: "", type: "score", version: "", content: "", sourceFile: "" });
    setShowImport(false);
  };

  const handleTrace = async (id: string) => {
    const detail = await fetchMaterialDetail(id);
    setTraceResult(detail);
    setTraceVisible(true);
  };

  const traceMappings = (traceResult?.mappings || []) as Record<string, unknown>[];
  const traceHistory = (traceResult?.change_history || []) as Record<string, unknown>[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl text-mohei">材料总览</h2>
          <p className="text-sm text-gray-500 font-serif mt-1">
            管理琴谱、注疏与笔记材料
          </p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-gutong text-gutong hover:bg-gutong/10 transition-all duration-200 font-serif text-sm"
        >
          <Plus size={16} />
          导入材料
        </button>
      </div>

      {showImport && (
        <div className="bg-white rounded-md shadow-warm p-6 mb-6">
          <h3 className="font-serif font-semibold text-mohei mb-4">导入新材料</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 font-serif mb-1">标题</label>
              <input
                type="text"
                value={importForm.title}
                onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
                placeholder="材料标题"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-serif mb-1">类型</label>
              <select
                value={importForm.type}
                onChange={(e) => setImportForm({ ...importForm, type: e.target.value as SourceMaterial["type"] })}
                className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
              >
                <option value="score">琴谱</option>
                <option value="annotation">注疏</option>
                <option value="note">笔记</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-serif mb-1">版本</label>
              <input
                type="text"
                value={importForm.version}
                onChange={(e) => setImportForm({ ...importForm, version: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
                placeholder="版本标识"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 font-serif mb-1">来源文件</label>
            <input
              type="text"
              value={importForm.sourceFile}
              onChange={(e) => setImportForm({ ...importForm, sourceFile: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
              placeholder="来源文件名"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 font-serif mb-1">内容</label>
            <textarea
              value={importForm.content}
              onChange={(e) => setImportForm({ ...importForm, content: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200 min-h-[120px] resize-y"
              placeholder="粘贴材料内容..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowImport(false)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 transition-all duration-200 font-serif text-sm"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 rounded-md bg-gutong text-white hover:bg-gutong/90 transition-all duration-200 font-serif text-sm"
            >
              确认导入
            </button>
          </div>
        </div>
      )}

      {traceVisible && traceResult && (
        <div className="bg-white rounded-md shadow-warm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-mohei flex items-center gap-2">
              <Layers size={16} className="text-dianlan" />
              溯源详情：{String(traceResult.title || "")}
            </h3>
            <button
              onClick={() => setTraceVisible(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-serif"
            >
              关闭
            </button>
          </div>

          {traceMappings.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-serif mb-2">关联映射</p>
              <div className="space-y-1">
                {traceMappings.map((m, i) => (
                  <div key={i} className="text-sm font-serif text-mohei flex items-center gap-2">
                    <span className="text-dianlan">↔</span>
                    {String(m.mapped_title || m.report_section || "未知")}
                    <span className="text-xs text-gray-400">[{String(m.mapped_version || "")}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {traceHistory.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-serif mb-2">变更记录</p>
              <div className="space-y-1">
                {traceHistory.map((s, i) => (
                  <div key={i} className="text-xs font-serif text-mohei/70 flex items-center gap-2">
                    <span className="text-gutong">·</span>
                    [{String(s.created_at || "")}] {String(s.field || "")}: "{String(s.old_value || "")}" → "{String(s.new_value || "")}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {traceMappings.length === 0 && traceHistory.length === 0 && (
            <p className="text-sm text-gray-400 font-serif">暂无溯源信息</p>
          )}
        </div>
      )}

      {materialsLoading ? (
        <div className="text-center py-16 text-gray-400 font-serif">
          加载中...
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16">
          <Music size={48} className="mx-auto text-gutong/30 mb-4" />
          <p className="text-gray-400 font-serif">暂无材料，请点击"导入材料"添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} onTrace={handleTrace} />
          ))}
        </div>
      )}
    </div>
  );
}
