import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { ControlBar } from "@/components/ControlBar";
import { SpectrumChart } from "@/components/SpectrumChart";
import { DataTable } from "@/components/DataTable";
import { SafetySidebar } from "@/components/SafetySidebar";
import { ReportPanel } from "@/components/ReportPanel";
import { AnomalyPanel } from "@/components/AnomalyPanel";
import { AuditView } from "@/components/AuditView";
import { GuidedTour, TOTAL_TOUR_STEPS } from "@/components/GuidedTour";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LineChart, Table2, AlertTriangle, FileSearch } from "lucide-react";
import { useLabStore } from "@/store/useLabStore";

export default function Home() {
  const {
    batches,
    samples,
    anomalies,
    auditLogs,
    currentBatchId,
    mainTab,
    setMainTab,
    selectedSampleId,
    hasRun,
    tourStep,
    setTourStep,
    showReport,
    setShowReport,
  } = useLabStore();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentBatch = batches[currentBatchId];
  const currentSamples = samples[currentBatchId] || [];
  const currentAnomalies = anomalies[currentBatchId] || [];
  const selectedSample =
    currentSamples.find((s) => s.id === selectedSampleId) || null;

  const confirmCandidates = useMemo(
    () =>
      currentSamples.filter(
        (s) =>
          (s.isAnomaly && !s.manuallyOverridden) || s.judgeResult === "待确认"
      ),
    [currentSamples]
  );

  const unresolvedCount = currentAnomalies.filter((a) => !a.resolved).length;

  const tabs = [
    { key: "spectrum" as const, label: "谱图与数据", icon: LineChart },
    { key: "anomaly" as const, label: "异常追踪", icon: AlertTriangle, badge: unresolvedCount },
    { key: "audit" as const, label: "批号审计", icon: FileSearch },
  ];

  return (
    <div className="min-h-screen flex flex-col watermark-bg">
      <Header batches={batches} />

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto space-y-4">
        <ControlBar
          info={currentBatch}
          onManualConfirmClick={() => setConfirmOpen(true)}
          onStartTour={() => setTourStep(0)}
        />

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 xl:col-span-3 order-3 xl:order-1">
            <SafetySidebar
              notes={currentBatch.safetyNotes}
              selectedSample={selectedSample}
            />
          </div>

          <div className="col-span-12 xl:col-span-6 order-1 xl:order-2 space-y-4">
            <div className="card overflow-hidden">
              <div className="flex border-b border-ink-100 bg-ink-50">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = mainTab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setMainTab(t.key)}
                      className={[
                        "flex items-center gap-2 px-5 py-3 text-sm font-serif transition-colors border-b-2 -mb-px relative",
                        active
                          ? "text-ink-800 border-copper-500 bg-white"
                          : "text-ink-500 border-transparent hover:text-ink-700 hover:bg-ink-100/50",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                      {t.badge && t.badge > 0 && (
                        <span
                          className={[
                            "h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center",
                            active
                              ? "bg-red-500 text-white"
                              : "bg-red-100 text-red-600",
                          ].join(" ")}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 space-y-4">
                {mainTab === "spectrum" && hasRun && (
                  <div className="space-y-4">
                    <SpectrumChart
                      data={currentBatch.spectrum}
                      highlightLambda={selectedSample?.peakWavelength}
                    />
                    <DataTable samples={currentSamples} />
                  </div>
                )}

                {mainTab === "spectrum" && !hasRun && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-copper-50 border-2 border-dashed border-copper-300 mb-4">
                      <Table2 className="h-7 w-7 text-copper-500" />
                    </div>
                    <div className="font-serif text-ink-700 mb-1">
                      点击「开始判读」按钮
                    </div>
                    <div className="text-sm text-ink-400">
                      系统将自动计算浓度并判读络合结果
                    </div>
                  </div>
                )}

                {mainTab === "anomaly" && (
                  <AnomalyPanel
                    anomalies={currentAnomalies}
                    samples={currentSamples}
                    auditLogs={auditLogs}
                    onConfirmSample={() => setConfirmOpen(true)}
                  />
                )}

                {mainTab === "audit" && (
                  <AuditView
                    info={currentBatch}
                    samples={currentSamples}
                    allBatches={batches}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-3 order-2 xl:order-3">
            {showReport || !hasRun ? (
              <ReportPanel info={currentBatch} samples={currentSamples} />
            ) : (
              <div className="card p-5">
                <div className="text-center py-8">
                  <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-2 font-semibold">
                    报告暂未生成
                  </div>
                  <div className="text-sm text-ink-600 mb-4">
                    开始判读后此处将显示
                    <br />
                    自动生成的判读文字报告
                  </div>
                  <button
                    onClick={() => setShowReport(true)}
                    className="text-xs text-copper-600 hover:text-copper-700 font-serif"
                  >
                    查看基础信息预览 →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {tourStep !== null && (
        <GuidedTour
          step={tourStep}
          total={TOTAL_TOUR_STEPS}
          onClose={() => setTourStep(null)}
          onPrev={() => setTourStep(Math.max(0, tourStep - 1))}
          onNext={() =>
            tourStep >= TOTAL_TOUR_STEPS - 1
              ? setTourStep(null)
              : setTourStep(tourStep + 1)
          }
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        candidates={confirmCandidates}
      />
    </div>
  );
}
