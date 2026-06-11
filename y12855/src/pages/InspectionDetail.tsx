import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  Navigation,
  Save,
  Send,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useInspectionStore } from "@/store/inspectionStore";
import {
  NeedsReviewChip,
  ResultBadge,
  RiskLevelBadge,
  StatusBadge,
} from "@/components/ResultBadge";
import { SectionTitle, ResultAvailabilityPanel } from "@/components/FormulaCard";
import DiffViewer from "@/components/DiffViewer";
import { AuditCredential } from "@/components/AuditCredential";
import { resultAvailabilityLabel } from "@/utils/linkageEngine";

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const insp = useInspectionStore((s) => s.getInspection(id ?? ""));
  const updatePhoto = useInspectionStore((s) => s.updatePhoto);
  const resolveAlertReview = useInspectionStore((s) => s.resolveAlertReview);
  const resolveConclusionReview = useInspectionStore((s) => s.resolveConclusionReview);
  const updateStatus = useInspectionStore((s) => s.updateStatus);
  const addReviewNote = useInspectionStore((s) => s.addReviewNote);

  const [note, setNote] = useState("");
  const [operatorName] = useState("陈志远");

  if (!insp) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="text-ocean-500 mb-3">未找到对应的巡检记录</div>
        <button className="btn-primary" onClick={() => nav("/")}>
          <ArrowLeft className="w-4 h-4" /> 回到日历
        </button>
      </div>
    );
  }

  const pendingAlerts = insp.riskAlerts.filter((a) => a.needsReview).length;
  const conclusionPending = insp.conclusion?.needsReview;
  const availabilityInfo = resultAvailabilityLabel(insp);

  const triggerSimulatePhotoUpdate = (photoId: string, caption: string) => {
    updatePhoto(
      insp.id,
      photoId,
      { caption: `${caption}（调度员人工修正 ${new Date().toLocaleTimeString("zh-CN")}）` },
      "照片描述需反映现场实际情况，原描述不准确。",
      operatorName,
    );
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto animate-slide-in-up">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => nav("/")}
          className="btn-secondary !py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          返回日历
        </button>
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-2xl text-ocean-800">
            {insp.code}
          </span>
          <ResultBadge availability={insp.availability} />
          <StatusBadge status={insp.status} />
          <NeedsReviewChip count={pendingAlerts + (conclusionPending ? 1 : 0)} />
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Ship className="w-4 h-4 text-ocean-500" />
          <span className="text-ocean-600 font-medium">{insp.ranchName}</span>
          <span className="text-ocean-300 mx-1">·</span>
          <span className="text-ocean-500">{insp.date}</span>
          <span className="text-ocean-300 mx-1">·</span>
          <span className="text-ocean-500">调度员 {insp.dispatcherName}</span>
        </div>
      </div>

      <ResultAvailabilityPanel
        overall={availabilityInfo.overall}
        details={availabilityInfo.details}
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <SectionTitle
            title="巡检照片与联动追踪"
            subtitle="修改照片后自动触发关联风险通报、结论的待复核标记"
            icon={<Camera className="w-5 h-5" />}
            actions={
              <span className="text-xs text-ocean-500">
                共 {insp.photos.length} 张 · 其中 {insp.photos.filter((p) => p.revision > 1).length} 张已修改
              </span>
            }
          />
          <div className="grid grid-cols-3 gap-4">
            {insp.photos.map((p, idx) => (
              <div key={p.id} className="card overflow-hidden card-hover">
                <div className="relative aspect-square bg-steel-100 overflow-hidden">
                  <img
                    src={p.url}
                    alt={p.caption}
                    className="w-full h-full object-cover"
                  />
                  {p.revision > 1 && (
                    <div className="absolute top-2 left-2 chip bg-amber-500 text-white text-[10px] shadow">
                      修订 v{p.revision}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 chip bg-ocean-900/80 text-white text-[10px] backdrop-blur">
                    #{idx + 1}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-xs text-ocean-700 leading-snug line-clamp-2 min-h-[32px]">
                    {p.caption}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-ocean-400 font-mono">
                    <span>{p.capturedAt.slice(11, 16)}</span>
                    {p.exifGps && (
                      <span>
                        {p.exifGps.lat.toFixed(4)}, {p.exifGps.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="divider-thin !my-1" />
                  <button
                    onClick={() => triggerSimulatePhotoUpdate(p.id, p.caption)}
                    className="w-full text-[11px] btn-secondary !py-1 !px-2"
                  >
                    <ImageIcon className="w-3 h-3" />
                    模拟修改并触发联动
                  </button>
                </div>
              </div>
            ))}
          </div>

          {(pendingAlerts > 0 || conclusionPending) && (
            <div className="rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 animate-slide-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <div className="font-serif font-bold text-lg text-amber-900">
                    照片修改已标记 {pendingAlerts + (conclusionPending ? 1 : 0)} 项关联内容待复核
                  </div>
                  <div className="text-xs text-amber-700">
                    请逐一确认以下风险通报和结论，无误后勾选「已复核」
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {insp.riskAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-md border p-4 transition-all ${
                      a.needsReview
                        ? "border-amber-300 bg-white shadow-sm animate-pulse-border text-amber-700"
                        : "border-steel-100 bg-emerald-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <RiskLevelBadge level={a.level} />
                          <span className="font-mono text-xs text-ocean-500">
                            {a.type}
                          </span>
                          {a.needsReview && (
                            <span className="chip bg-red-100 text-red-700 text-[10px]">
                              待复核
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-ocean-800 leading-relaxed">
                          {a.description}
                        </div>
                        <div className="text-[11px] text-ocean-400 mt-1 font-mono">
                          最后同步：{new Date(a.lastSyncedAt).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      {a.needsReview && (
                        <button
                          onClick={() => resolveAlertReview(insp.id, a.id)}
                          className="btn-primary !py-1.5 !text-xs shrink-0"
                        >
                          <Check className="w-3 h-3" />
                          已复核
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {insp.conclusion && (
                  <div
                    className={`rounded-md border p-4 transition-all ${
                      insp.conclusion.needsReview
                        ? "border-amber-300 bg-white shadow-sm animate-pulse-border text-amber-700"
                        : "border-steel-100 bg-emerald-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-serif font-semibold text-ocean-800">
                            <FileText className="w-4 h-4 inline mr-1" />
                            巡检结论
                          </span>
                          {insp.conclusion.needsReview && (
                            <span className="chip bg-red-100 text-red-700 text-[10px]">
                              待复核
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-ocean-700 leading-relaxed mb-2">
                          {insp.conclusion.summary}
                        </div>
                        <div className="rounded-md bg-parchment-50 border border-parchment-200 p-2 text-xs text-amber-900">
                          <span className="font-semibold">建议：</span>
                          {insp.conclusion.recommendation}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-ocean-500 flex-wrap">
                          <span>来源材料：</span>
                          {insp.conclusion.sourceMaterialIds.map((m) => (
                            <span
                              key={m}
                              className="chip bg-ocean-50 text-ocean-600 border border-ocean-100 text-[10px]"
                            >
                              {m.slice(0, 10)}
                            </span>
                          ))}
                        </div>
                      </div>
                      {insp.conclusion.needsReview && (
                        <button
                          onClick={() => resolveConclusionReview(insp.id)}
                          className="btn-primary !py-1.5 !text-xs shrink-0"
                        >
                          <Check className="w-3 h-3" />
                          结论无误
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <SectionTitle
            title="前后变化对比（照片修改记录）"
            subtitle="照片 v1 → v2 联动影响，字段差异一目了然"
            icon={<Navigation className="w-5 h-5" />}
          />
          <div className="space-y-4">
            {insp.photos.filter((p) => p.previousUrl).length > 0 ? (
              insp.photos
                .filter((p) => p.previousUrl)
                .map((p) => (
                  <DiffViewer
                    key={p.id}
                    title={`照片修订 v${p.revision} · ${p.caption.slice(0, 24)}...`}
                    oldImageUrl={p.previousUrl}
                    newImageUrl={p.url}
                    imageCaption={p.caption}
                    fields={[
                      {
                        label: "照片说明",
                        oldValue: p.caption.replace(/（调度员.*）/g, "").trim(),
                        newValue: p.caption,
                        changed: true,
                      },
                      {
                        label: "版本号",
                        oldValue: `v${p.revision - 1}`,
                        newValue: `v${p.revision}`,
                        changed: true,
                      },
                      {
                        label: "GPS 坐标",
                        oldValue: p.exifGps
                          ? `${(p.exifGps.lat - 0.002).toFixed(4)}, ${(p.exifGps.lng - 0.003).toFixed(4)}`
                          : "—",
                        newValue: p.exifGps
                          ? `${p.exifGps.lat.toFixed(4)}, ${p.exifGps.lng.toFixed(4)}`
                          : "—",
                        changed: true,
                      },
                    ]}
                  />
                ))
            ) : (
              <div className="card p-6 text-center text-sm text-ocean-500">
                本巡检暂无照片修改记录
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 space-y-6">
          <SectionTitle
            title="三级审签复核备注"
            subtitle="调度员 → 值班主任 → 海事处，每级留痕不可删除"
            icon={<FileText className="w-4 h-4" />}
          />
          <div className="card p-4 space-y-3">
            {[
              { key: "DISPATCHER", label: "调度员", by: "陈志远" },
              { key: "SUPERVISOR", label: "值班主任", by: "王海涛" },
              { key: "MARITIME", label: "海事处", by: "李慧敏" },
            ].map((stage, idx) => {
              const notes = insp.reviewNotes.filter((n) => n.stage === stage.key);
              const approved = notes.some((n) => n.approved);
              return (
                <div key={stage.key} className="rounded-md border border-steel-100 overflow-hidden">
                  <div
                    className={`px-4 py-2 flex items-center justify-between ${
                      approved ? "bg-emerald-50 border-b border-emerald-100" : "bg-slate-50 border-b border-steel-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          approved
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-300 text-white"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-sm text-ocean-800">
                        {stage.label} · {stage.by}
                      </span>
                    </div>
                    {approved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span className="chip bg-amber-100 text-amber-700 text-[10px]">
                        待审签
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {notes.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">
                        本节点暂未填写审签备注
                      </div>
                    ) : (
                      notes.map((n) => (
                        <div
                          key={n.id}
                          className="rounded-md bg-parchment-50 border border-parchment-200 p-3"
                        >
                          <div className="text-[11px] text-ocean-500 mb-1 flex items-center justify-between">
                            <span>{n.reviewerName}</span>
                            <span className="font-mono">
                              {new Date(n.timestamp).toLocaleString("zh-CN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                month: "2-digit",
                                day: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-xs text-ocean-700 leading-relaxed">
                            {n.note}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <div className="pt-3 space-y-2">
              <label className="label">填写复核备注（调度员）</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="说明数据复核情况，例如：照片已确认与原始现场视频一致，航迹偏差在合理范围..."
                className="w-full text-sm rounded-md border border-steel-200 bg-white px-3 py-2 focus:ring-2 focus:ring-ocean-400 focus:outline-none min-h-[72px]"
              />
              <div className="flex gap-2">
                <button
                  disabled={!note.trim()}
                  onClick={() => {
                    addReviewNote(insp.id, operatorName, "DISPATCHER", note, true);
                    setNote("");
                  }}
                  className="btn-secondary flex-1 !py-1.5 !text-xs disabled:opacity-40"
                >
                  <Save className="w-3 h-3" />
                  保存备注
                </button>
                <button
                  disabled={!note.trim() || insp.status !== "PENDING_CONFIRM"}
                  onClick={() => {
                    addReviewNote(insp.id, operatorName, "DISPATCHER", note, true);
                    updateStatus(insp.id, "APPROVED", operatorName, note);
                    setNote("");
                  }}
                  className="btn-primary flex-1 !py-1.5 !text-xs disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                  提交值班主任
                </button>
              </div>
            </div>
          </div>

          <SectionTitle
            title="人工修正留痕（本次巡检）"
            subtitle={`${insp.revisions.length} 条修正凭证`}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {insp.revisions.length === 0 ? (
              <div className="card p-6 text-center text-sm text-ocean-500">
                本次巡检暂无人工修正
              </div>
            ) : (
              insp.revisions.map((r) => (
                <AuditCredential key={r.id} revision={r} showActions={false} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
