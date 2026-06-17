import TopNav from "@/components/layout/TopNav";
import StatusChart from "@/components/analysis/StatusChart";
import RemarkImpactList from "@/components/analysis/RemarkImpactList";
import PrePublicChecklist from "@/components/analysis/PrePublicChecklist";
import { BarChart3 } from "lucide-react";

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <TopNav />
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded bg-ink-700 text-white flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink-800">分析统计</h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed ml-10">
            朴素展示复核数据：状态分布一目了然，
            <span className="font-semibold text-amber-700">后补备注如何影响结论讲得清</span>，
            公示前可按状态分组逐一排查待复核点位。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <StatusChart />
          </div>
          <div className="lg:col-span-2 space-y-5">
            <RemarkImpactList />
            <PrePublicChecklist />
          </div>
        </div>
      </main>
    </div>
  );
}
