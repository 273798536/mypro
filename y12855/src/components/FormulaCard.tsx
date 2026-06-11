import { BookOpen, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

export function FormulaCard({
  title,
  formula,
  unit,
  applicable,
  note,
}: {
  title: string;
  formula: string;
  unit: string;
  applicable: string;
  note?: string;
}) {
  return (
    <div className="bg-parchment-100 rounded-lg border border-parchment-300 shadow-parchment overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-parchment-200 bg-gradient-to-r from-parchment-100 to-parchment-50">
        <BookOpen className="w-4 h-4 text-amber-700" />
        <h4 className="font-serif font-semibold text-ocean-800 text-sm tracking-wide">
          {title}
        </h4>
        <span className="ml-auto chip bg-white/80 text-amber-800 border border-amber-200 text-[11px]">
          输出单位：{unit}
        </span>
      </div>
      <div className="p-5 space-y-4">
        <pre className="formula-block whitespace-pre-wrap leading-8 text-ocean-800 text-[13px] bg-white/60">
          {formula}
        </pre>
        <div className="rounded-md bg-ocean-50/70 border border-ocean-100 p-3 space-y-1">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-ocean-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-ocean-700 mb-1">
                适用范围
              </div>
              <div className="text-xs text-ocean-600 leading-relaxed">
                {applicable}
              </div>
            </div>
          </div>
        </div>
        {note && (
          <div className="rounded-md bg-amber-50/70 border border-amber-200 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                {note}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FailureHint({
  title,
  steps,
  overall,
}: {
  title: string;
  overall: string;
  steps: { title: string; detail: string; action: string }[];
}) {
  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50/60 overflow-hidden animate-slide-in-right">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 bg-gradient-to-r from-red-100 to-red-50">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <div>
          <h4 className="font-semibold text-red-800 text-sm">{title}</h4>
          <div className="text-xs text-red-600 mt-0.5">{overall}</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="rounded-md bg-white border border-red-100 p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-inner">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <div className="font-semibold text-red-800 text-sm flex items-center gap-2">
                  {s.title}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">具体情况：</span>
                  {s.detail}
                </div>
                <div className="rounded-md bg-ocean-50 border-l-4 border-ocean-500 p-3 text-xs text-ocean-800 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-ocean-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">如何处理：</span>
                    {s.action}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultAvailabilityPanel({
  details,
  overall,
}: {
  overall: "AVAILABLE" | "PENDING" | "RECOLLECT";
  details: {
    label: string;
    value: string;
    status: "AVAILABLE" | "PENDING" | "RECOLLECT";
  }[];
}) {
  const bannerMap = {
    AVAILABLE: {
      title: "全部数据可用，海事处可直接采信",
      cls: "from-emerald-500 to-emerald-600",
      icon: CheckCircle2,
      sub: "所有 6 项数据质量检查通过，结果可直接用于周度报告与海事归档。",
    },
    PENDING: {
      title: "部分数据暂缓，需港口调度员复核",
      cls: "from-amber-500 to-amber-600",
      icon: Info,
      sub: "以下项目需要补充确认后，结论才能同步至海事处。",
    },
    RECOLLECT: {
      title: "存在必须重新采集的数据项",
      cls: "from-red-500 to-red-600",
      icon: AlertTriangle,
      sub: "以下项目缺失或质量不合格，无法采信，需安排重新采集。",
    },
  } as const;
  const banner = bannerMap[overall];
  const Icon = banner.icon;

  const colorOf = (s: string) =>
    s === "AVAILABLE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : s === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  const dotOf = (s: string) =>
    s === "AVAILABLE"
      ? "bg-availability-available"
      : s === "PENDING"
        ? "bg-availability-pending"
        : "bg-availability-recollect";

  return (
    <div className="card overflow-hidden">
      <div className={`bg-gradient-to-r ${banner.cls} px-5 py-4 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-serif text-lg font-semibold tracking-wide">
              {banner.title}
            </div>
            <div className="text-xs text-white/85 mt-0.5">{banner.sub}</div>
          </div>
        </div>
      </div>
      <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
        {details.map((d, idx) => (
          <div
            key={idx}
            className={`rounded-md border px-4 py-3 ${colorOf(d.status)} transition-all hover:shadow-md`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${dotOf(d.status)}`} />
              <span className="font-semibold text-xs uppercase tracking-wider">
                {d.label}
              </span>
            </div>
            <div className="text-sm font-mono mt-1">{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-5 pb-3 border-b border-steel-200">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-md bg-ocean-800 text-white flex items-center justify-center shadow">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-serif font-bold text-xl tracking-wide text-ocean-800">
            {title}
          </h2>
          {subtitle && (
            <div className="text-sm text-ocean-500 mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
