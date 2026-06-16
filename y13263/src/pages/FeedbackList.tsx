import { useMemo, useState } from "react";
import {
  Plus,
  Upload,
  FileText,
  Clock,
  User,
  Edit3,
  Ban,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/store";
import PageHeader from "@/components/PageHeader";
import { StatusBadge } from "@/components/Badges";
import { formatDateTime } from "@/utils/helpers";
import type { ResidentFeedback, ImportFeedbackRaw } from "@/types";

export default function FeedbackList() {
  const feedbacks = useAppStore((s) => s.feedbacks);
  const locations = useAppStore((s) => s.locations);
  const addFeedback = useAppStore((s) => s.addFeedback);
  const supplementFeedback = useAppStore((s) => s.supplementFeedback);
  const withdrawFeedback = useAppStore((s) => s.withdrawFeedback);
  const suspendFeedback = useAppStore((s) => s.suspendFeedback);
  const confirmSuspended = useAppStore((s) => s.confirmSuspended);
  const importFeedbacks = useAppStore((s) => s.importFeedbacks);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newFb, setNewFb] = useState({
    locationName: "",
    content: "",
    source: "12345热线",
    reporterName: "",
  });
  const [supplementId, setSupplementId] = useState<string | null>(null);
  const [supplementContent, setSupplementContent] = useState("");
  const [supplementRemark, setSupplementRemark] = useState("");
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const grouped = useMemo(() => {
    const m: Record<string, ResidentFeedback[]> = {};
    for (const f of feedbacks) {
      const loc = locations.find((l) => l.id === f.locationId);
      const key = loc?.canonicalName ?? f.locationNameRaw;
      (m[key] = m[key] || []).push(f);
    }
    return m;
  }, [feedbacks, locations]);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const list = JSON.parse(String(ev.target?.result)) as ImportFeedbackRaw[];
        importFeedbacks(list);
        alert(`成功导入 ${list.length} 条反馈`);
      } catch (err) {
        alert("导入失败：JSON 格式错误");
      }
    };
    reader.readAsText(file);
  }

  function handleAdd() {
    if (!newFb.locationName || !newFb.content) {
      alert("请填写地点名称和反馈内容");
      return;
    }
    addFeedback({
      locationName: newFb.locationName,
      content: newFb.content,
      source: newFb.source,
      reporterName: newFb.reporterName || undefined,
      status: "pending",
    });
    setNewFb({ locationName: "", content: "", source: "12345热线", reporterName: "" });
    setShowAdd(false);
  }

  function handleSupplement() {
    if (!supplementId || !supplementContent) return;
    supplementFeedback(supplementId, supplementContent, supplementRemark || undefined);
    setSupplementId(null);
    setSupplementContent("");
    setSupplementRemark("");
  }

  function handleWithdraw() {
    if (!withdrawId || !withdrawReason) return;
    withdrawFeedback(withdrawId, withdrawReason);
    setWithdrawId(null);
    setWithdrawReason("");
  }

  function handleSuspend() {
    if (!suspendId || !suspendReason) return;
    suspendFeedback(suspendId, suspendReason);
    setSuspendId(null);
    setSuspendReason("");
  }

  return (
    <div>
      <PageHeader
        title="居民反馈管理"
        subtitle="分批补充不覆盖原始记录，撤回保留痕迹，重复投诉自动挂起"
        actions={
          <>
            <label className="btn-secondary cursor-pointer">
              <Upload size={15} /> 导入 JSON 旧材料
              <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
            </label>
            <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
              <Plus size={15} /> 新增反馈
            </button>
          </>
        }
      />

      {showAdd && (
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="label">地点名称（原始写法）</label>
              <input
                className="input"
                value={newFb.locationName}
                onChange={(e) => setNewFb({ ...newFb, locationName: e.target.value })}
                placeholder="例：和平路建设大街东北角"
              />
            </div>
            <div>
              <label className="label">反馈来源</label>
              <select
                className="input"
                value={newFb.source}
                onChange={(e) => setNewFb({ ...newFb, source: e.target.value })}
              >
                <option>12345热线</option>
                <option>微信公众号</option>
                <option>现场巡查</option>
                <option>网格员上报</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">反馈内容</label>
              <textarea
                className="input min-h-[72px]"
                value={newFb.content}
                onChange={(e) => setNewFb({ ...newFb, content: e.target.value })}
                placeholder="详细描述积水、积淤情况"
              />
            </div>
            <div>
              <label className="label">反映人（可选）</label>
              <input
                className="input"
                value={newFb.reporterName}
                onChange={(e) => setNewFb({ ...newFb, reporterName: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowAdd(false)}>取消</button>
            <button className="btn-primary" onClick={handleAdd}>保存</button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="card p-16 text-center text-municipal-400">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">暂无反馈记录</p>
          <p className="text-xs mt-1">可通过右上角「导入 JSON 旧材料」或「新增反馈」开始</p>
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(grouped).map(([locName, list]) => (
          <div key={locName} className="card overflow-hidden">
            <div className="px-4 py-3 bg-municipal-50 border-b border-municipal-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-municipal-500" />
                <span className="font-serif font-semibold text-municipal-800">{locName}</span>
                <span className="text-xs text-municipal-500">共 {list.length} 条</span>
              </div>
            </div>
            <div className="divide-y divide-municipal-50">
              {list.map((f) => {
                const isOpen = !!expanded[f.id];
                const loc = locations.find((l) => l.id === f.locationId);
                const aliases = loc?.aliases.filter((a) => a.aliasName !== loc.canonicalName) ?? [];
                return (
                  <div key={f.id}>
                    <div className="px-4 py-3 flex items-start gap-3 hover:bg-municipal-50/50 transition-colors">
                      <div className="w-1 self-stretch bg-municipal-200 rounded-full mx-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={f.status} />
                          {f.duplicateOf && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-warning-700 bg-warning-50 px-1.5 py-0.5 rounded">
                              <AlertTriangle size={11} /> 疑似重复，已挂起
                            </span>
                          )}
                          <span className="text-xs text-municipal-500 flex items-center gap-1">
                            <Clock size={11} /> {formatDateTime(f.createdAt)}
                          </span>
                          <span className="text-xs text-municipal-500">{f.source}</span>
                          {f.reporterName && (
                            <span className="text-xs text-municipal-500 flex items-center gap-1">
                              <User size={11} /> {f.reporterName}
                            </span>
                          )}
                          {aliases.length > 0 && (
                            <span className="text-[11px] text-municipal-500">
                              曾用名：{aliases.map((a) => a.aliasName).join("、")}
                            </span>
                          )}
                        </div>
                        <p className={`mt-1.5 text-sm leading-relaxed ${f.status === "withdrawn" ? "line-through text-municipal-400" : "text-municipal-700"}`}>
                          {f.content}
                        </p>
                        <p className="mt-1 text-[11px] text-municipal-400">
                          原始写法：「{f.locationNameRaw}」· ID {f.id.slice(-6)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {f.status === "active" && (
                          <>
                            <button className="btn-ghost !p-1.5" onClick={() => setSupplementId(f.id)} title="补充材料">
                              <Edit3 size={14} />
                            </button>
                            <button className="btn-ghost !p-1.5 text-warning-600" onClick={() => setSuspendId(f.id)} title="挂起待确认">
                              <PauseCircle size={14} />
                            </button>
                            <button className="btn-ghost !p-1.5 text-danger-600" onClick={() => setWithdrawId(f.id)} title="撤回">
                              <Ban size={14} />
                            </button>
                          </>
                        )}
                        {f.status === "suspended" && (
                          <button className="btn-success !py-1 !px-2 text-xs" onClick={() => confirmSuspended(f.id)}>
                            <PlayCircle size={13} /> 排班确认有效
                          </button>
                        )}
                        <button className="btn-ghost !p-1.5" onClick={() => setExpanded((e) => ({ ...e, [f.id]: !isOpen }))}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-8 pb-4">
                        <div className="text-xs font-medium text-municipal-500 mb-2">版本时间线（共 {f.versions.length} 次变更）</div>
                        <div className="space-y-2">
                          {f.versions.map((v, i) => (
                            <div key={v.id} className="flex gap-3 text-xs">
                              <div className="flex flex-col items-center">
                                <div className={`w-2 h-2 rounded-full ${i === f.versions.length - 1 ? "bg-municipal-500" : "bg-municipal-200"}`} />
                                {i < f.versions.length - 1 && <div className="w-px flex-1 bg-municipal-100 mt-1" />}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-pending">{changeTypeLabel(v.changeType)}</span>
                                  <span className="text-municipal-500">{v.operator}</span>
                                  <span className="text-municipal-400">{formatDateTime(v.createdAt)}</span>
                                </div>
                                {v.contentBefore && (
                                  <p className="mt-1 text-municipal-400 line-through">{v.contentBefore}</p>
                                )}
                                <p className={`mt-0.5 ${v.changeType === "withdraw" ? "text-danger-600" : "text-municipal-700"}`}>
                                  → {v.contentAfter}
                                </p>
                                {v.remark && (
                                  <p className="mt-1 text-municipal-500 italic">备注：{v.remark}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {supplementId && (
        <Modal onClose={() => setSupplementId(null)} title="分批补充反馈材料（不覆盖原始记录）">
          <label className="label">补充内容</label>
          <textarea
            className="input min-h-[96px] mb-3"
            value={supplementContent}
            onChange={(e) => setSupplementContent(e.target.value)}
            placeholder="输入补充的材料内容，原始记录将作为版本保留"
          />
          <label className="label">备注说明（可选）</label>
          <input
            className="input mb-4"
            value={supplementRemark}
            onChange={(e) => setSupplementRemark(e.target.value)}
            placeholder="例：居民第二次来电补充描述"
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setSupplementId(null)}>取消</button>
            <button className="btn-primary" onClick={handleSupplement}>保存补充</button>
          </div>
          <p className="text-[11px] text-municipal-400 mt-3">
            提示：补充操作会新增版本记录，原始内容不会被覆盖或删除，可在时间线中查看。
          </p>
        </Modal>
      )}

      {withdrawId && (
        <Modal onClose={() => setWithdrawId(null)} title="撤回反馈记录（软删除，保留痕迹）">
          <label className="label">撤回原因</label>
          <textarea
            className="input min-h-[80px] mb-4"
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="请说明撤回原因，将记录在变更快照中"
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setWithdrawId(null)}>取消</button>
            <button className="btn-danger" onClick={handleWithdraw}>确认撤回</button>
          </div>
          <p className="text-[11px] text-danger-500 mt-3">
            警告：撤回不会物理删除记录，相关方案将自动重算，旧版本保留可对比。
          </p>
        </Modal>
      )}

      {suspendId && (
        <Modal onClose={() => setSuspendId(null)} title="挂起反馈，等待排班同事确认">
          <label className="label">挂起原因</label>
          <textarea
            className="input min-h-[80px] mb-4"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="例：疑似与已有反馈重复，需排班同事现场核实"
          />
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setSuspendId(null)}>取消</button>
            <button className="btn-warning" onClick={handleSuspend}>确认挂起</button>
          </div>
          <p className="text-[11px] text-warning-600 mt-3">
            提示：挂起状态下方案不会给出稳定结论，需排班同事确认后方可继续。
          </p>
        </Modal>
      )}
    </div>
  );
}

function changeTypeLabel(t: string): string {
  return { create: "首次记录", supplement: "补充材料", withdraw: "撤回", edit: "编辑" }[t] ?? t;
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-municipal-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card w-full max-w-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg font-semibold text-municipal-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
