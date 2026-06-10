import { Link } from "react-router-dom";
import { useApp } from "@/store/useApp";
import BatchCard from "@/components/BatchCard";
import {
  Calculator,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  FileCheck2,
  Beaker,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const { role, stats, batches, getPublishedBatches, getLatestVersion } = useApp();
  const s = stats();
  const displayBatches = role === "student" ? getPublishedBatches() : batches;

  const cards = [
    {
      label: "总批次",
      value: s.total,
      icon: <Beaker size="18" />,
      tone: "from-lab-500 to-lab-400",
    },
    {
      label: "已发布",
      value: s.published,
      icon: <FileCheck2 size="18" />,
      tone: "from-chem-500 to-chem-400",
    },
    {
      label: "待复测",
      value: s.retest,
      icon: <AlertCircle size="18" />,
      tone: "from-warn-500 to-warn-400",
    },
    {
      label: "平均纯度",
      value: `${s.avgPurity || 0}%`,
      icon: <TrendingUp size="18" />,
      tone: "from-ink-700 to-ink-500",
    },
  ];

  const quickLinks = role !== "student" ? [
    { to: "/balance", title: "配平计算", desc: "日常入口 · 录入参数生成批次草稿", icon: <Calculator size="20" />, tone: "bg-lab-50 text-lab-700 border-lab-100" },
    { to: "/records", title: "实验记录追踪", desc: "查看所有批次 · 结果+解释", icon: <ClipboardList size="20" />, tone: "bg-chem-50 text-chem-700 border-chem-100" },
    { to: "/retest", title: "复测建议", desc: "月底/课前入口 · 可操作建议", icon: <AlertCircle size="20" />, tone: "bg-warn-50 text-warn-700 border-warn-100" },
  ] : [
    { to: "/records", title: "查看实验报告", desc: "只显示已发布最新版本", icon: <FileCheck2 size="20" />, tone: "bg-chem-50 text-chem-700 border-chem-100" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card bg-gradient-to-br from-white via-white to-lab-50/40 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-gradient-to-br from-chem-400/20 to-lab-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-ink-100 text-xs text-ink-600 shadow-soft">
              <Sparkles size="12" className="text-chem-500" />
              首次打开已自动加载 3 条示例批次数据
            </div>
            <h2 className="mt-4 font-display text-4xl text-ink-800 leading-tight">
              围绕「实验记录」这一条主线
              <br />
              <span className="text-lab-600">结果旁边永远有解释</span>
            </h2>
            <p className="mt-3 text-ink-500 leading-relaxed max-w-2xl">
              环境监测员改批次报告时，旧结果、新结果、学生看到的结论通过「版本发布锁」保持一致；
              同轮复核必须同时看到反应条件、温度曲线、pH越界，让学生一眼看出这次处理的是眼前这批具体材料。
            </p>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {quickLinks.map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className={`p-4 rounded-xl2 border ${q.tone} hover:-translate-y-0.5 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/80 shadow-soft">{q.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center justify-between gap-2">
                        {q.title}
                        <ArrowRight size="14" className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">{q.desc}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="shrink-0 w-full sm:w-[340px] p-5 rounded-xl2 bg-white border border-ink-100 shadow-soft">
            <div className="text-xs text-ink-500 font-medium mb-3">关键提示</div>
            <ul className="space-y-2 text-sm text-ink-700">
              <li className="flex gap-2"><span className="text-chem-500 mt-0.5">●</span>导出的CSV/PDF与界面摘要严格对得上</li>
              <li className="flex gap-2"><span className="text-lab-500 mt-0.5">●</span>处理失败不抛内部错误，告诉你缺哪份反应条件</li>
              <li className="flex gap-2"><span className="text-warn-500 mt-0.5">●</span>重复导入/补录不产生双份结论</li>
              <li className="flex gap-2"><span className="text-alert-500 mt-0.5">●</span>学生视图只看已发布版本，看不到草稿</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="card-soft group hover:-translate-y-0.5 transition-transform">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-ink-500">{c.label}</div>
                <div className="mt-2 font-display text-3xl text-ink-800">{c.value}</div>
              </div>
              <div className={`p-2 rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-soft`}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="section-title">
              {role === "student" ? "已发布实验报告" : "最近批次"}
            </h3>
            <p className="section-subtitle">
              {role === "student"
                ? "这里只显示老师发布的最新版本，没有版本切换，保证结论唯一"
                : "点击「复核/详情」进入同轮三要素复核页"}
            </p>
          </div>
          {role !== "student" && (
            <Link to="/records" className="btn-ghost">
              查看全部 <ArrowRight size="14" />
            </Link>
          )}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {displayBatches.slice(0, 4).map((b) => (
            <BatchCard key={b.batchId} batch={b} />
          ))}
          {displayBatches.length === 0 && (
            <div className="col-span-full card text-center text-ink-500">
              暂无数据，环境监测员可从「配平计算」开始录入第一个批次
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
