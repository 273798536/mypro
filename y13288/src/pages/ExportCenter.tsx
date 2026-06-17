import { useState, useMemo } from "react";
import { useSchemeStore } from "@/store/useSchemeStore";
import { EXPORT_PERSPECTIVE_LABELS } from "@/types";
import type { ExportPerspective } from "@/types";
import { generateExportContent, exportAsText } from "@/utils/exportEngine";
import { FileOutput, Eye, Download } from "lucide-react";

const PERSPECTIVES: ExportPerspective[] = ["scene_annotation", "sidebar_note", "page_summary"];

export default function ExportCenter() {
  const [activePerspective, setActivePerspective] = useState<ExportPerspective>("scene_annotation");
  const scheme = useSchemeStore((s) => s.schemes.find((sc) => sc.id === s.activeSchemeId));

  const content = useMemo(() => {
    if (!scheme) return "";
    return generateExportContent(scheme, activePerspective);
  }, [scheme, activePerspective]);

  const supplementaryNotes = useMemo(() => {
    if (!scheme) return [];
    const notes = scheme.materials.filter((m) => m.type === "supplementary_note");
    return notes.map((note) => ({
      note,
      linked: scheme.materials.filter(
        (m) => note.relatedMaterialIds.includes(m.id) || m.relatedMaterialIds.includes(note.id)
      ),
    }));
  }, [scheme]);

  const handleExportCurrent = () => {
    if (!scheme) return;
    const label = EXPORT_PERSPECTIVE_LABELS[activePerspective];
    exportAsText(content, `${scheme.name}_${label}`);
  };

  const handleExportAll = () => {
    if (!scheme) return;
    PERSPECTIVES.forEach((p) => {
      const c = generateExportContent(scheme, p);
      const label = EXPORT_PERSPECTIVE_LABELS[p];
      exportAsText(c, `${scheme.name}_${label}`);
    });
  };

  if (!scheme) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        暂无激活方案
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif-title text-2xl font-bold text-teal flex items-center gap-2">
          <FileOutput size={28} />
          导出中心
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          多视角一致性导出 · 场景标注、侧边说明、页面摘要始终是同一套话
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {PERSPECTIVES.map((p) => (
          <button
            key={p}
            onClick={() => setActivePerspective(p)}
            className={`px-5 py-2.5 text-sm transition-all duration-200 border-b-2 -mb-px ${
              activePerspective === p
                ? "border-teal text-teal font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {EXPORT_PERSPECTIVE_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="card relative">
        <div className="flex items-center gap-2 mb-3 text-gray-500">
          <Eye size={16} />
          <span className="text-sm font-medium">实时预览 · {EXPORT_PERSPECTIVE_LABELS[activePerspective]}</span>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800 bg-sand rounded-lg p-5 border border-dashed border-gray-300 min-h-[320px]">
          {content}
        </pre>
      </div>

      {supplementaryNotes.length > 0 && (
        <div className="card">
          <h3 className="font-serif-title text-lg font-bold text-teal mb-4">后补备注与结论联动</h3>
          <div className="space-y-3">
            {supplementaryNotes.map(({ note, linked }) => (
              <div
                key={note.id}
                className="border border-dashed border-gray-300 rounded-lg p-4 bg-sand/50"
              >
                <div className="text-sm text-gray-800 font-medium">{note.content}</div>
                {linked.length > 0 && (
                  <div className="mt-2 pl-4 space-y-2">
                    {linked.map((m) => (
                      <div key={m.id} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-teal mt-0.5">→</span>
                        <span>{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
                {linked.length === 0 && (
                  <div className="mt-2 pl-4 text-sm text-gray-400 italic">暂无关联材料</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleExportCurrent} className="btn-primary flex items-center gap-2">
          <Download size={16} />
          导出当前视角
        </button>
        <button onClick={handleExportAll} className="btn-secondary flex items-center gap-2">
          <FileOutput size={16} />
          导出全部视角
        </button>
      </div>
    </div>
  );
}
