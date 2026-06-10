import { Activity, Beaker, Sparkles } from "lucide-react";
import StatsCards from "@/components/dashboard/StatsCards";
import FilterBar from "@/components/dashboard/FilterBar";
import SampleCardList from "@/components/dashboard/SampleCardList";
import BatchEffectChart from "@/components/dashboard/BatchEffectChart";
import { cn } from "@/lib/utils";

function SectionHeader({
  icon,
  title,
  subtitle,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between", className)}>
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-primary-900">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute -top-10 right-1/4 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-300/5 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header
          className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 p-8 shadow-xl"
          style={{ animationDelay: "0ms" }}
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-teal-400/30 blur-3xl" />
            <div className="absolute -bottom-16 right-20 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute left-10 top-10 h-2 w-2 rounded-full bg-white/40 animate-pulse-soft" />
            <div className="absolute right-40 top-20 h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse-soft" style={{ animationDelay: "0.5s" }} />
            <div className="absolute left-1/3 bottom-8 h-1 w-1 rounded-full bg-white/40 animate-pulse-soft" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-200 ring-1 ring-white/20 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                引物设计边界检查 · 质量控制面板
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                样本质量总览
              </h1>
              <p className="mt-2 max-w-xl text-sm text-primary-100/80 sm:text-base">
                自动判定样本状态（正常 / 边界 / 异常），实时监控批次效应 PCA 聚类，
                支持多维度筛选与人工复核。
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                <Activity className="h-8 w-8 text-teal-300" />
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs uppercase tracking-wider text-primary-200/70">更新时间</p>
                <p className="font-mono text-sm font-semibold text-white">
                  {new Date("2026-06-11T09:30:00").toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-xs text-primary-200/70">BAT-2026-W24 批次</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <SectionHeader
            icon={<Beaker className="h-5 w-5 text-primary-600" />}
            title="质量统计"
            subtitle="各状态样本数量与待复核任务概览"
            className="mb-4"
          />
          <StatsCards />
        </section>

        <section className="mt-8">
          <FilterBar />
        </section>

        <section className="mt-8">
          <SectionHeader
            icon={<Activity className="h-5 w-5 text-primary-600" />}
            title="样本列表"
            subtitle="点击卡片查看完整指标、复核记录与状态谱系"
            className="mb-4"
          />
          <SampleCardList />
        </section>

        <section className="mt-8 pb-12">
          <SectionHeader
            icon={<Activity className="h-5 w-5 text-primary-600" />}
            title="批次效应分析"
            subtitle="主成分分析散点图 · 1σ / 2σ / 3σ 同心圆参考 · 点击散点查看具体原因"
            className="mb-4"
          />
          <BatchEffectChart />
        </section>
      </div>
    </div>
  );
}
