import { useState } from "react";
import { useSchemeStore } from "@/store/useSchemeStore";
import { MATERIAL_TYPE_LABELS } from "@/types";
import type { MaterialType } from "@/types";
import { Plus, FileText, MessageSquare, StickyNote, CheckCircle2 } from "lucide-react";

const TYPE_BADGE: Record<MaterialType, string> = {
  meeting_minutes: "badge-meeting",
  opinion_form: "badge-opinion",
  supplementary_note: "badge-note",
  conclusion: "badge-conclusion",
};

const TYPE_ICON: Record<MaterialType, React.ElementType> = {
  meeting_minutes: FileText,
  opinion_form: MessageSquare,
  supplementary_note: StickyNote,
  conclusion: CheckCircle2,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Workbench() {
  const scheme = useSchemeStore((s) => s.getActiveScheme());
  const addMaterial = useSchemeStore((s) => s.addMaterial);

  const [formType, setFormType] = useState<MaterialType>("meeting_minutes");
  const [formSource, setFormSource] = useState("");
  const [formContent, setFormContent] = useState("");

  if (!scheme) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        暂无活跃方案
      </div>
    );
  }

  const materials = [...scheme.materials].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const typeCoverage = new Set(materials.map((m) => m.type));
  const completeness = (typeCoverage.size / 4) * 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSource.trim() || !formContent.trim()) return;
    addMaterial(scheme.id, {
      type: formType,
      source: formSource.trim(),
      content: formContent.trim(),
    });
    setFormSource("");
    setFormContent("");
  };

  const conclusionIds = new Set(
    materials.filter((m) => m.type === "conclusion").map((m) => m.id)
  );

  return (
    <div className="min-h-screen p-6 space-y-8" style={{ backgroundColor: "#F5F5F0" }}>
      <h1 className="font-serif-title text-2xl font-bold" style={{ color: "#0F4C54" }}>
        方案工作台
      </h1>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#0F4C54" }}>
          方案总览看板
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} style={{ color: "#0F4C54" }} />
              <span className="font-semibold" style={{ color: "#0F4C54" }}>
                {scheme.name}
              </span>
            </div>
            {scheme.conclusion && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {scheme.conclusion}
              </p>
            )}
            <div className="text-sm text-gray-500 mb-3">
              材料数：{scheme.materials.length}
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>完整度</span>
                <span>{Math.round(completeness)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${completeness}%`,
                    backgroundColor: completeness === 100 ? "#0F4C54" : "#E8742C",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#0F4C54" }}>
          材料录入区
        </h2>
        <form className="card space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                材料类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as MaterialType)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((type) => (
                  <option key={type} value={type}>
                    {MATERIAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                来源
              </label>
              <input
                type="text"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                placeholder="输入来源"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary flex items-center gap-1"
                style={{ backgroundColor: "#E8742C" }}
              >
                <Plus size={16} />
                提交材料
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="输入材料内容"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#0F4C54" }}>
          意见时间线
        </h2>
        <div className="relative pl-10">
          <div className="timeline-line" />
          {materials.map((material) => {
            const Icon = TYPE_ICON[material.type];
            const isConclusion = material.type === "conclusion";
            const hasLinkedConclusions =
              material.type === "supplementary_note" &&
              material.relatedMaterialIds.some((id) => conclusionIds.has(id));
            const linkedConclusions = hasLinkedConclusions
              ? materials.filter(
                  (m) =>
                    m.type === "conclusion" &&
                    material.relatedMaterialIds.includes(m.id)
                )
              : [];

            return (
              <div key={material.id} className="relative pb-6">
                <div
                  className={`timeline-dot ${isConclusion ? "timeline-dot-active" : ""}`}
                />
                <div className="ml-8">
                  <div className="card">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={TYPE_BADGE[material.type]}>
                        {MATERIAL_TYPE_LABELS[material.type]}
                      </span>
                      <Icon size={14} style={{ color: "#0F4C54" }} />
                      <span className="text-xs text-gray-400 ml-auto">
                        {material.source}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{material.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTime(material.createdAt)}
                    </p>
                  </div>
                  {linkedConclusions.length > 0 && (
                    <div className="timeline-connector mt-2">
                      {linkedConclusions.map((conclusion) => (
                        <div
                          key={conclusion.id}
                          className="card text-xs"
                          style={{ borderLeftColor: "#E8742C", borderLeftWidth: 2 }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 size={12} style={{ color: "#E8742C" }} />
                            <span className="badge-conclusion">结论</span>
                          </div>
                          <p className="text-gray-600">{conclusion.content}</p>
                          <p className="text-gray-400 mt-1">
                            {formatTime(conclusion.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
