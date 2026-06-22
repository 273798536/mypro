import { FolderOpen, AlertTriangle, Download, X } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";

const cards = [
  {
    key: "materials",
    title: "材料位置",
    desc: "原始 CSV、参数配置文件存放路径",
    icon: FolderOpen,
    gradient: "from-slate-deep to-slate-soft",
    target: "data-section",
  },
  {
    key: "issues",
    title: "问题去哪看",
    desc: "排序不稳定、异常点、待复核记录",
    icon: AlertTriangle,
    gradient: "from-amber-warm to-amber-soft",
    target: "unstable-section",
  },
  {
    key: "results",
    title: "结果怎么拿",
    desc: "抽样样本集、统计指标、导出 JSON",
    icon: Download,
    gradient: "from-teal-jade to-teal-soft",
    target: "result-section",
  },
];

export default function OnboardingPanel() {
  const dismissed = useSamplingStore((s) => s.onboardingDismissed);
  const dismiss = useSamplingStore((s) => s.dismissOnboarding);

  if (dismissed) return null;

  const scrollTo = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative mb-6 animate-fadeUp">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          新人第一次打开？先看这里
        </h2>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-md hover:bg-ink-100 text-ink-500 transition-colors"
          aria-label="关闭导航"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => scrollTo(c.target)}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`animate-fadeUp group relative overflow-hidden text-left p-5 rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-card hover:shadow-cardHover transition-all hover:-translate-y-0.5`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">0{i + 1}</span>
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">{c.title}</h3>
              <p className="text-sm text-white/80 font-mono">{c.desc}</p>
              <div className="mt-4 text-xs font-mono text-white/60 flex items-center gap-1 group-hover:text-white/90 transition-colors">
                点击跳转 →
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
