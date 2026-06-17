import { useState } from "react";
import {
  Upload,
  FileWarning,
  StickyNote,
  Plus,
  FolderDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { SourceType } from "@/types";
import { StatusTag, SourceTag, WeightTag } from "@/components/StatusTag/StatusTag";
import { formatDate } from "@/utils/helpers";
import { uid } from "@/utils/helpers";

type Tab = "online" | "anomaly" | "supplement";

const tabConfig: Record<Tab, { label: string; icon: typeof Upload; hint: string; type: SourceType }> = {
  online: {
    label: "线上工单导入",
    icon: Upload,
    hint: "批量导入系统工单，导入后统一进入本地数据源",
    type: "online_ticket",
  },
  anomaly: {
    label: "异常样本登记",
    icon: FileWarning,
    hint: "录入名称不一致的材料，系统标记为异常样本标签",
    type: "anomaly",
  },
  supplement: {
    label: "后补说明管理",
    icon: StickyNote,
    hint: "补充后加的说明文档，关联到对应工单记录",
    type: "supplement",
  },
};

export default function Materials() {
  const addNewOrder = useAppStore((s) => s.addNewOrder);
  const data = useAppStore((s) => s.data);
  const [tab, setTab] = useState<Tab>("online");
  const [form, setForm] = useState({
    title: "",
    content: "",
    model_summary: "",
    material_name: "",
    confidence: 0.8,
    impact_weight: 1.0,
    threshold_affected: false,
  });

  const cfg = tabConfig[tab];
  const list = data.work_orders.filter((o) => o.source_type === cfg.type);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.model_summary.trim()) {
      alert("请填写标题、原文内容和模型摘要");
      return;
    }
    addNewOrder({
      title: form.title,
      content: form.content,
      model_summary: form.model_summary,
      source_type: cfg.type,
      confidence: form.confidence,
      threshold_affected: form.threshold_affected,
      material_name: tab === "anomaly" ? form.material_name || null : null,
      impact_weight: form.impact_weight,
    });
    setForm({
      title: "",
      content: "",
      model_summary: "",
      material_name: "",
      confidence: 0.8,
      impact_weight: 1.0,
      threshold_affected: false,
    });
  };

  return (
    <div className="space-y-6">
      <header className="animate-fade-in-up">
        <p className="text-sm text-navy-500">算法值班人入口 · 第一站</p>
        <h2 className="mt-1 text-2xl font-serif font-semibold text-navy-800">
          材料导入与统一管理
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          线上工单、异常样本、后补说明从此处进入同一份本地数据源，供后续改判和追溯使用。
        </p>
      </header>

      <div className="flex flex-wrap gap-2 animate-fade-in-up stagger-1">
        {(Object.keys(tabConfig) as Tab[]).map((k) => {
          const c = tabConfig[k];
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`group px-4 py-3 rounded-xl text-left transition-all ${
                active
                  ? "bg-navy-600 text-white shadow-lg shadow-navy-600/20"
                  : "bg-white text-navy-700 shadow-card hover:shadow-card-hover border border-navy-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <c.icon
                  className={`w-4 h-4 ${active ? "text-white" : "text-navy-500"}`}
                  strokeWidth={1.75}
                />
                <span className="font-medium text-sm">{c.label}</span>
                <span
                  className={`ml-1 chip text-[10px] ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-navy-50 text-navy-600"
                  }`}
                >
                  {
                    data.work_orders.filter((o) => o.source_type === c.type)
                      .length
                  }{" "}
                  条
                </span>
              </div>
              <p
                className={`mt-1 text-xs ${
                  active ? "text-white/80" : "text-navy-500"
                }`}
              >
                {c.hint}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="card p-5 lg:col-span-2 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-navy-600" strokeWidth={2} />
            </div>
            <h3 className="font-serif font-semibold text-navy-800 text-lg">
              新增 {cfg.label.replace("导入", "").replace("登记", "").replace("管理", "")}
            </h3>
          </div>
          <p className="text-xs text-navy-500 mb-5">{cfg.hint}</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                工单/材料标题
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={
                  tab === "anomaly"
                    ? "如：【异常】客户投诉对话摘要 - 名称不一致"
                    : tab === "supplement"
                    ? "如：【后补】关于0032登录工单的补充说明"
                    : "如：工单 #TK20260618-0001 用户无法登录"
                }
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />
            </div>

            {tab === "anomaly" && (
              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle
                    className="w-3.5 h-3.5"
                    strokeWidth={2}
                  />
                  原始文件名（与标题不一致的名称）
                </label>
                <input
                  type="text"
                  className="input-field border-amber-200 focus:ring-amber-200/60 focus:border-amber-300"
                  placeholder="如：6月第三周会话抽检汇总_final(2).xlsx"
                  value={form.material_name}
                  onChange={(e) =>
                    setForm({ ...form, material_name: e.target.value })
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                原文内容
              </label>
              <textarea
                className="input-field min-h-[120px] resize-y"
                placeholder="粘贴工单原文或问题描述..."
                value={form.content}
                onChange={(e) =>
                  setForm({ ...form, content: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                模型生成摘要
              </label>
              <textarea
                className="input-field min-h-[80px] resize-y"
                placeholder="模型输出的摘要内容，人工改判将基于此条进行确认/修改"
                value={form.model_summary}
                onChange={(e) =>
                  setForm({ ...form, model_summary: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                  置信度 {(form.confidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.99"
                  step="0.01"
                  value={form.confidence}
                  onChange={(e) =>
                    setForm({ ...form, confidence: Number(e.target.value) })
                  }
                  className="w-full accent-navy-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-navy-600 mb-1.5">
                  影响权重 {form.impact_weight.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.1"
                  value={form.impact_weight}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      impact_weight: Number(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 p-3 rounded-lg bg-amber-50/60 border border-amber-100 cursor-pointer hover:bg-amber-50 transition">
              <input
                type="checkbox"
                checked={form.threshold_affected}
                onChange={(e) =>
                  setForm({
                    ...form,
                    threshold_affected: e.target.checked,
                  })
                }
                className="mt-0.5 accent-amber-600"
              />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  受阈值漂移影响
                </p>
                <p className="text-[11px] text-amber-700/80">
                  勾选后改判工作台将展示处理指引（优先处理高权重、对比区间、导出差异）
                </p>
              </div>
            </label>

            <button type="submit" className="btn-primary w-full">
              <FolderDown className="w-4 h-4" strokeWidth={1.75} />
              导入并进入本地数据源
            </button>
          </form>
        </section>

        <section className="card lg:col-span-3 animate-fade-in-up stagger-3 overflow-hidden">
          <header className="p-5 border-b border-navy-50 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-semibold text-navy-800 text-lg">
                已导入的 {cfg.label.replace("导入", "").replace("登记", "").replace("管理", "")}
              </h3>
              <p className="mt-1 text-xs text-navy-500">
                来自同一份本地数据源 · 共 {list.length} 条
              </p>
            </div>
            <div className="chip bg-moss-50 text-moss-700 border border-moss-200/60">
              <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
              与改判工作台、历史页共享
            </div>
          </header>

          <div className="divide-y divide-navy-50 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {list.length === 0 && (
              <div className="p-16 text-center">
                <FileText
                  className="w-12 h-12 text-navy-200 mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-navy-500">
                  暂无 {cfg.label}，请从左侧表单新增。
                </p>
              </div>
            )}
            {list.map((o, i) => (
              <article
                key={o.id}
                className={`p-4 hover:bg-navy-50/40 transition animate-fade-in-up stagger-${Math.min(
                  i + 1,
                  6
                )}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StatusTag status={o.status} />
                      <SourceTag source={o.source_type} />
                      <WeightTag weight={o.impact_weight} />
                      {o.material_name && (
                        <span className="chip bg-crimson-50 text-crimson-700 border border-crimson-200/60">
                          <FileWarning className="w-3 h-3" strokeWidth={2} />
                          文件名：{o.material_name}
                        </span>
                      )}
                      {o.threshold_affected && (
                        <span className="chip bg-amber-50 text-amber-700 border border-amber-200/60">
                          阈值影响
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-navy-800 text-sm">
                      {o.title}
                    </p>
                    <p className="mt-1 text-xs text-navy-500 line-clamp-2">
                      模型摘要：{o.model_summary}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-navy-400">
                      {formatDate(o.created_at)}
                    </p>
                    <p className="mt-1 text-[11px] font-mono text-navy-400">
                      ID: {o.id.slice(-6)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
