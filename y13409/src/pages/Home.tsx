import TopBar from "@/components/TopBar";
import OnboardingPanel from "@/components/OnboardingPanel";
import DirtyDataTable from "@/components/DirtyDataTable";
import StepTimeline from "@/components/StepTimeline";
import InteractiveChart from "@/components/InteractiveChart";
import UnstableSection from "@/components/UnstableSection";
import ResultPanel from "@/components/ResultPanel";
import ParamVersionDrawer from "@/components/ParamVersionDrawer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <ParamVersionDrawer />

      <main className="flex-1 px-6 py-6 max-w-[1440px] w-full mx-auto">
        <OnboardingPanel />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 space-y-6">
            <DirtyDataTable />
            <ResultPanel />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <StepTimeline />
          </div>

          <div className="xl:col-span-3 space-y-6">
            <InteractiveChart />
            <UnstableSection />
          </div>
        </div>

        <footer className="mt-10 pt-6 border-t border-ink-200 text-center text-[11px] font-mono text-ink-500">
          概率抽样报告讲解 · 数据分析小孟专属工作台 · 每一步都落到样本上
        </footer>
      </main>
    </div>
  );
}
