import { useState, useRef } from "react";
import { useSceneStore } from "../../hooks/useSceneStore";
import type { Material, TimelineEvent } from "../../data/types";
import {
  Upload,
  FileText,
  MessageSquare,
  X,
  Plus,
  RotateCcw,
} from "lucide-react";

interface ImportPanelProps {
  onClose: () => void;
  defaultType?: "inspection_photo" | "retraction_record" | "verbal_note";
}

export default function ImportPanel({ onClose, defaultType }: ImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"file" | "text">(
    defaultType ? "text" : "file"
  );
  const [textInput, setTextInput] = useState("");
  const [materialType, setMaterialType] = useState<
    "inspection_photo" | "retraction_record" | "verbal_note"
  >(defaultType || "inspection_photo");
  const [materialTitle, setMaterialTitle] = useState("");
  const [relatedObjectId, setRelatedObjectId] = useState("");
  const {
    addMaterial,
    addTimelineEvent,
    lightObjects,
    materials,
  } = useSceneStore();

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (Array.isArray(data.materials)) {
          data.materials.forEach((m: Material) => {
            addMaterial(m);
            addTimelineEvent({
              id: `evt-import-${m.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: m.importedAt,
              type: "import",
              description: `导入材料：${m.title}`,
              relatedObjectId: m.relatedObjectId,
              relatedMaterialId: m.id,
              status: "confirmed",
              isCaliberChange: m.caliberChanged,
            });
          });
        }

        if (Array.isArray(data.events)) {
          data.events.forEach((evt: TimelineEvent) => {
            addTimelineEvent(evt);
          });
        }

        onClose();
      } catch {
        alert("文件格式错误，请导入有效的 JSON 文件");
      }
    };
    reader.readAsText(file);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !materialTitle.trim()) {
      alert("请填写材料标题和内容");
      return;
    }

    const objId =
      relatedObjectId || lightObjects[0]?.id || "lo-001";
    const now = new Date().toISOString();
    const matId = `mat-manual-${Date.now()}`;

    const hasExisting = materials.some(
      (m) => m.relatedObjectId === objId
    );
    const isCaliberChange =
      materialType === "retraction_record" || hasExisting;

    const newMaterial: Material = {
      id: matId,
      relatedObjectId: objId,
      type: materialType,
      title: materialTitle,
      content: textInput,
      importedAt: now,
      modifiedAt: now,
      hasRetraction: materialType === "retraction_record",
      caliberChanged: isCaliberChange,
    };

    addMaterial(newMaterial);

    const eventType =
      materialType === "retraction_record"
        ? "retraction"
        : materialType === "verbal_note"
          ? "note"
          : "import";

    addTimelineEvent({
      id: `evt-${matId}`,
      timestamp: now,
      type: eventType,
      description: `${
        materialType === "retraction_record"
          ? "新增撤回记录"
          : materialType === "verbal_note"
            ? "新增口头说明"
            : "新增巡检材料"
      }：${materialTitle}`,
      relatedObjectId: objId,
      relatedMaterialId: matId,
      status:
        materialType === "retraction_record"
          ? "retracted"
          : hasExisting
            ? "modified"
            : "pending",
      isCaliberChange: isCaliberChange,
    });

    setTextInput("");
    setMaterialTitle("");
    onClose();
  };

  const typeOptions = [
    { value: "inspection_photo", label: "巡检照片", icon: FileText },
    { value: "retraction_record", label: "撤回记录", icon: RotateCcw },
    { value: "verbal_note", label: "口头说明", icon: MessageSquare },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1A1A2E] border border-zinc-700/50 rounded-lg shadow-2xl w-[520px] max-w-[90vw]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Upload size={15} className="text-copper" />
            导入材料
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-zinc-800/40">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                activeTab === "file"
                  ? "bg-copper/20 text-copper border border-copper/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              文件导入
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                activeTab === "text"
                  ? "bg-copper/20 text-copper border border-copper/40"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              文本录入
            </button>
          </div>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {activeTab === "file" ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700/50 rounded-lg p-8 text-center cursor-pointer hover:border-copper/40 hover:bg-copper/5 transition-colors"
              >
                <FileText
                  size={32}
                  className="mx-auto mb-2 text-zinc-600"
                />
                <p className="text-sm text-zinc-400">点击或拖拽 JSON 文件到此处</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  格式：{"{ materials: [...], events: [...] }"}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />

              <div className="text-[11px] text-zinc-600 bg-zinc-900/50 rounded p-3">
                <p className="font-medium text-zinc-500 mb-1">导入后会自动：</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>将材料加入材料列表，自动标记口径变更</li>
                  <li>在历史时间线生成对应事件记录</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1.5">
                  材料类型
                </label>
                <div className="flex gap-2">
                  {typeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setMaterialType(
                          opt.value as
                            | "inspection_photo"
                            | "retraction_record"
                            | "verbal_note"
                        )
                      }
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded transition-colors ${
                        materialType === opt.value
                          ? "bg-copper/20 text-copper border border-copper/40"
                          : "bg-zinc-900/50 text-zinc-500 border border-zinc-800/50 hover:text-zinc-300"
                      }`}
                    >
                      <opt.icon size={12} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1.5">
                  关联灯光对象
                </label>
                <select
                  value={relatedObjectId || lightObjects[0]?.id || ""}
                  onChange={(e) => setRelatedObjectId(e.target.value)}
                  className="w-full bg-zinc-900/80 text-xs text-zinc-300 border border-zinc-700/50 rounded px-2.5 py-1.5 outline-none focus:border-copper/50"
                >
                  {lightObjects.map((lo) => (
                    <option key={lo.id} value={lo.id}>
                      {lo.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1.5">
                  材料标题
                </label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="例如：右灯巡检补充记录"
                  className="w-full bg-zinc-900/80 text-xs text-zinc-200 border border-zinc-700/50 rounded px-2.5 py-1.5 outline-none focus:border-copper/50 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1.5">
                  材料内容
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="输入巡检记录、撤回说明或口头通知内容..."
                  rows={5}
                  className="w-full bg-zinc-900/80 text-xs text-zinc-200 border border-zinc-700/50 rounded px-2.5 py-2 outline-none focus:border-copper/50 resize-none placeholder:text-zinc-600"
                />
              </div>

              {materialType === "retraction_record" && (
                <div className="text-[11px] text-amber-500 bg-amber-900/10 border border-amber-700/30 rounded p-2.5">
                  <p>提示：撤回记录会自动标记为「口径变更」，并在历史时间线中以「已撤回」状态显示。</p>
                </div>
              )}

              <button
                onClick={handleTextSubmit}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-copper hover:bg-copper/90 text-zinc-900 text-xs font-medium rounded transition-colors"
              >
                <Plus size={13} />
                添加材料并记录到时间线
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
