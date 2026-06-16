import { useAppStore } from '../store/useAppStore';
import { ReportExport } from '../components/ReportExport';

export default function ReportPage() {
  const {
    currentBatch,
    buoyData,
    violations,
    waterQuality,
    farmLogs,
    anomalies,
    reviewRounds,
  } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-5xl mx-auto px-6 py-6 print:px-0 print:max-w-none">
        <ReportExport
          batchInfo={currentBatch}
          buoyDataList={buoyData}
          violations={violations}
          waterQuality={waterQuality}
          farmLogs={farmLogs}
          anomalies={anomalies}
          reviewRounds={reviewRounds}
        />
      </main>
    </div>
  );
}
