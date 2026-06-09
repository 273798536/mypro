import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDraftStore } from '@/store/draftStore';
import { DraftSidebar } from '@/components/DraftSidebar';
import { TopBar } from '@/components/TopBar';
import { FormulaPanel } from '@/components/FormulaPanel';
import { CounterExamplePanel } from '@/components/CounterExamplePanel';
import { ErrorAnalysisPanel } from '@/components/ErrorAnalysisPanel';
import { VersionTimeline } from '@/components/VersionTimeline';
import { DataTable } from '@/components/DataTable';
import { SpectrumChart, ErrorDistributionChart } from '@/components/Charts';

export default function DraftDetail() {
  const { id } = useParams<{ id: string }>();
  const { drafts, setActiveDraft, initStore } = useDraftStore();

  useEffect(() => {
    if (drafts.length === 0) initStore();
  }, [drafts.length, initStore]);

  useEffect(() => {
    if (id) setActiveDraft(id);
  }, [id, setActiveDraft]);

  const draft = drafts.find((d) => d.id === id);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <DraftSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {draft ? (
            <div className="flex flex-col gap-4 p-5">
              <Link
                to="/"
                className="inline-flex w-fit items-center gap-1 text-xs text-slate-500 transition hover:text-indigo-600"
              >
                <ArrowLeft size={12} /> 返回工作台
              </Link>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 space-y-4">
                  <FormulaPanel draft={draft} />
                  <CounterExamplePanel draft={draft} />
                  <VersionTimeline draft={draft} />
                </div>

                <div className="col-span-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-[320px]">
                      <SpectrumChart draft={draft} />
                    </div>
                    <div className="h-[320px]">
                      <ErrorDistributionChart rows={draft.dataRows} />
                    </div>
                  </div>

                  <div className="h-[420px]">
                    <DataTable draft={draft} />
                  </div>

                  <div className="h-[360px]">
                    <ErrorAnalysisPanel draft={draft} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-10 text-slate-400">
              草稿不存在
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
