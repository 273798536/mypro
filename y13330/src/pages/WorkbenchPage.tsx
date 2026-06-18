import { useReviewStore } from '@/store/useReviewStore';
import { SampleList } from '@/components/workbench/SampleList';
import { SampleDetail } from '@/components/workbench/SampleDetail';
import { ActionPanel } from '@/components/workbench/ActionPanel';
import { WorkbenchHeader } from '@/components/workbench/WorkbenchHeader';

export function WorkbenchPage() {
  const { session } = useReviewStore();
  const currentSample = session.samples.find(
    (s) => s.id === session.currentSampleId,
  );

  const reviewedCount = session.samples.filter(
    (s) => s.reviewStatus === 'confirmed',
  ).length;
  const boundaryCount = session.samples.filter((s) => s.isBoundary).length;
  const leakCount = session.samples.filter((s) => s.leakRisk !== 'none').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <WorkbenchHeader
        totalCount={session.samples.length}
        reviewedCount={reviewedCount}
        boundaryCount={boundaryCount}
        leakCount={leakCount}
        modelVersions={session.modelVersions}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-72 flex-shrink-0 border-r border-slate-700/50 overflow-hidden">
          <SampleList samples={session.samples} currentSampleId={session.currentSampleId || ''} />
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          {currentSample ? (
            <SampleDetail sample={currentSample} modelVersions={session.modelVersions} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              请选择一个样本查看详情
            </div>
          )}
        </div>

        <div className="w-80 flex-shrink-0 border-l border-slate-700/50 overflow-hidden">
          {currentSample ? (
            <ActionPanel sample={currentSample} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              选择样本后进行操作
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
