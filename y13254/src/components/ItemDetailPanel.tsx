import { useMemo, useState, useRef } from "react";
import { RefreshCw, MapPin, Upload, FileText, Send } from "lucide-react";
import {
  useStore,
  selectSelectedItem,
  selectSelectedLocation,
} from "../store";
import { updateItem, checkCoordinate, createFeedback as createFeedbackApi } from "../lib/api";
import type { ItemStatus, MaterialType } from "../shared/types";
import ItemCard from "./ItemCard";
import Empty from "./Empty";
import ManualConfirmModal from "./ManualConfirmModal";

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "pending_review", label: "待审核" },
  { value: "need_supplement", label: "待补材料" },
  { value: "pending_manual", label: "待人工确认" },
  { value: "approved", label: "已通过" },
  { value: "community_verified", label: "已核社区" },
];

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  photo: "照片",
  boundary: "边界",
  verbal_note: "笔录",
};

interface CoordCheckResult {
  lng: number;
  lat: number;
  valid: boolean;
  reason?: string;
}

export default function ItemDetailPanel({ className = "" }: { className?: string }) {
  const items = useStore((s) => s.items);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const locations = useStore((s) => s.locations);
  const selectedLocationId = useStore((s) => s.selectedLocationId);
  const judgements = useStore((s) => s.judgements);
  const loadJudgement = useStore((s) => s.loadJudgement);
  const materials = useStore((s) => s.materials);
  const feedbacks = useStore((s) => s.feedbacks);
  const loadFeedbacks = useStore((s) => s.loadFeedbacks);
  const uploadMaterialAndRefresh = useStore((s) => s.uploadMaterialAndRefresh);
  const setStore = useStore.setState;

  const selectedItem = useMemo(
    () => selectSelectedItem({ items, selectedItemId }),
    [items, selectedItemId],
  );
  const selectedLocation = useMemo(
    () => selectSelectedLocation({ locations, selectedLocationId }),
    [locations, selectedLocationId],
  );

  const [remarkDraft, setRemarkDraft] = useState<string>("");
  const [isUploadDrag, setIsUploadDrag] = useState(false);
  const [isCheckingCoord, setIsCheckingCoord] = useState(false);
  const [coordCheckResult, setCoordCheckResult] = useState<CoordCheckResult | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [modalReasons, setModalReasons] = useState<string[]>([]);
  const [feedbackDraft, setFeedbackDraft] = useState({
    originalText: "",
    mergedText: "",
    submittedBy: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedItem || !selectedLocation) {
    return (
      <div className={className}>
        <Empty />
      </div>
    );
  }

  const judgement = judgements[selectedItem.id];
  const itemMaterials = materials.filter(
    (m) => m.locationId === selectedItem.locationId,
  );
  const materialTypes = itemMaterials.map((m) => m.type) as MaterialType[];
  const itemFeedbacks = feedbacks[selectedItem.id] || [];

  const handleUpdateItem = async (patch: Parameters<typeof updateItem>[1]) => {
    try {
      const updated = await updateItem(selectedItem.id, patch);
      setStore({
        items: items.map((i) => (i.id === selectedItem.id ? updated : i)),
      });
    } catch (e) {
      console.error("更新失败", e);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void handleUpdateItem({ status: e.target.value as ItemStatus });
  };

  const handleRemarkBlur = () => {
    if (remarkDraft && remarkDraft !== selectedItem.currentRemark) {
      void handleUpdateItem({ currentRemark: remarkDraft });
    }
  };

  const handleCheckCoordinate = async () => {
    setIsCheckingCoord(true);
    try {
      const result = await checkCoordinate(selectedLocation.id, {
        lng: selectedLocation.lng,
        lat: selectedLocation.lat,
      });
      const coordResult: CoordCheckResult = {
        lng: selectedLocation.lng,
        lat: selectedLocation.lat,
        valid: result.valid,
        reason: result.reason,
      };
      setCoordCheckResult(coordResult);
      if (!result.valid) {
        setModalReasons(result.reason ? [result.reason] : ["坐标位置疑似偏移"]);
        setShowManualModal(true);
      }
    } finally {
      setIsCheckingCoord(false);
    }
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locationId", selectedLocation.id);
      formData.append("type", "photo");
      formData.append("title", file.name);
      formData.append("uploader", "current_user");
      try {
        await uploadMaterialAndRefresh(formData);
      } catch (e) {
        console.error("上传失败", e);
      }
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackDraft.originalText || !feedbackDraft.mergedText) return;
    try {
      await createFeedbackApi({
        itemId: selectedItem.id,
        originalText: feedbackDraft.originalText,
        mergedText: feedbackDraft.mergedText,
        submittedBy: feedbackDraft.submittedBy,
      });
      setFeedbackDraft({ originalText: "", mergedText: "", submittedBy: "" });
      void loadFeedbacks(selectedItem.id);
    } catch (e) {
      console.error("提交失败", e);
    }
  };

  const handleModalConfirm = (remark: string) => {
    const newRemark = selectedItem.currentRemark
      ? `${selectedItem.currentRemark}\n${remark}`
      : remark;
    void handleUpdateItem({ currentRemark: newRemark });
  };

  return (
    <div className={`${className} flex flex-col overflow-hidden`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
        <ItemCard
          item={selectedItem}
          location={selectedLocation}
          judgement={judgement}
          materialTypes={materialTypes}
        />

        <div className="flex gap-2">
          <button
            onClick={() => void loadJudgement(selectedItem.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-night-500 hover:bg-night-700 text-white px-3 py-2 rounded-md text-sm transition-all hover:shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新判断
          </button>
          <button
            onClick={handleCheckCoordinate}
            disabled={isCheckingCoord}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-md text-sm transition-all disabled:opacity-60"
          >
            <MapPin className="w-3.5 h-3.5" />
            {isCheckingCoord ? "检查中..." : "检查坐标偏移"}
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">状态</label>
          <select
            value={selectedItem.status}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">备注</label>
          <textarea
            rows={3}
            defaultValue={selectedItem.currentRemark}
            onChange={(e) => setRemarkDraft(e.target.value)}
            onBlur={handleRemarkBlur}
            placeholder="输入备注信息..."
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm resize-none"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">材料列表</h4>
            <span className="text-xs text-slate-400">{itemMaterials.length} 个</span>
          </div>
          <div className="space-y-2">
            {itemMaterials.map((mat) => {
              const anyMat = mat as any;
              const title: string =
                anyMat.title ?? anyMat.payload?.title ?? `${MATERIAL_TYPE_LABELS[mat.type]} 材料`;
              const uploader: string = anyMat.uploader ?? anyMat.submittedBy ?? "未知";
              const filePath: string =
                anyMat.filePath ?? anyMat.payload?.url ?? anyMat.payload?.path ?? "";
              return (
                <button
                  key={mat.id}
                  onClick={() => window.open(filePath ? "/" + filePath : "#")}
                  className="w-full text-left p-3 rounded-md border border-slate-200 hover:border-night-300 hover:bg-night-50/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-night-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-night-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {title}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded shrink-0">
                          {MATERIAL_TYPE_LABELS[mat.type]}
                        </span>
                        {!!mat.hasCaliberChange && (
                          <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded shrink-0">
                            口径变更 v{mat.version}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {uploader} · {new Date(mat.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {itemMaterials.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-400">暂无材料</div>
            )}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsUploadDrag(true);
            }}
            onDragLeave={() => setIsUploadDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsUploadDrag(false);
              void handleUploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition-all ${
              isUploadDrag
                ? "border-night-400 bg-night-50"
                : "border-slate-300 hover:border-night-400 hover:bg-slate-50"
            }`}
          >
            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1.5" />
            <div className="text-xs text-slate-500">拖拽文件到此处或点击上传</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void handleUploadFiles(e.target.files)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">社区反馈</h4>
          {itemFeedbacks.length > 0 && (
            <div className="space-y-2">
              {itemFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-slate-400 mb-1">社区原始说法</div>
                      <div className="text-slate-700 whitespace-pre-wrap">{fb.originalText}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 mb-1">项目经理合并后</div>
                      <div className="text-slate-700 whitespace-pre-wrap">{fb.mergedText}</div>
                    </div>
                  </div>
                  <div className="text-slate-400 mt-2 text-right">
                    {fb.submittedBy || "匿名"} · {new Date(fb.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 p-3 rounded-md bg-white border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  社区原始说法
                </label>
                <textarea
                  rows={3}
                  value={feedbackDraft.originalText}
                  onChange={(e) =>
                    setFeedbackDraft((f) => ({ ...f, originalText: e.target.value }))
                  }
                  placeholder="原始说法..."
                  className="w-full px-2 py-1.5 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-xs resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  项目经理合并后
                </label>
                <textarea
                  rows={3}
                  value={feedbackDraft.mergedText}
                  onChange={(e) =>
                    setFeedbackDraft((f) => ({ ...f, mergedText: e.target.value }))
                  }
                  placeholder="合并后..."
                  className="w-full px-2 py-1.5 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-xs resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedbackDraft.submittedBy}
                onChange={(e) =>
                  setFeedbackDraft((f) => ({ ...f, submittedBy: e.target.value }))
                }
                placeholder="操作人"
                className="flex-1 px-2 py-1.5 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-xs"
              />
              <button
                onClick={() => void handleSubmitFeedback()}
                className="flex items-center gap-1 bg-night-500 hover:bg-night-700 text-white px-3 py-1.5 rounded-md text-xs transition-all hover:shadow-md"
              >
                <Send className="w-3 h-3" />
                提交
              </button>
            </div>
          </div>
        </div>

        {coordCheckResult && coordCheckResult.valid && (
          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            ✓ 坐标校验通过，点位位置正常
          </div>
        )}
      </div>

      <ManualConfirmModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        reasons={modalReasons}
        coordCheck={coordCheckResult || undefined}
        itemId={selectedItem.id}
        onConfirm={handleModalConfirm}
      />
    </div>
  );
}
