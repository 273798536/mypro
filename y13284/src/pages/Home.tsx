import TopBar from '@/components/TopBar';
import Scene3D from '@/components/Scene3D';
import FilterTimeline from '@/components/FilterTimeline';
import ComplaintList from '@/components/ComplaintList';
import ComplaintDetail from '@/components/ComplaintDetail';
import MergeModal from '@/components/MergeModal';
import CoordIssueModal from '@/components/CoordIssueModal';
import ApiDrawer from '@/components/ApiDrawer';
import { useBusinessStore } from '@/stores/useBusinessStore';

export default function Home() {
  const selectedId = useBusinessStore((s) => s.selectedId);
  const showMergeModal = useBusinessStore((s) => s.showMergeModal);
  const showCoordIssuePanel = useBusinessStore((s) => s.showCoordIssuePanel);

  return (
    <div className="w-full h-full flex flex-col bg-space-deep text-slate-200">
      <TopBar />

      <div className="flex-1 flex min-h-0">
        <div className="w-[65%] min-w-0 flex flex-col">
          <Scene3D />
        </div>

        <div className="w-[35%] min-w-0 flex flex-col border-l border-white/5">
          <div className="shrink-0">
            <FilterTimeline />
          </div>

          <div className="flex-1 flex min-h-0">
            <div className={`${selectedId ? 'w-[55%]' : 'w-full'} min-h-0 flex flex-col border-r border-white/5`}>
              <ComplaintList />
            </div>

            {selectedId && (
              <div className="w-[45%] min-h-0 flex flex-col">
                <ComplaintDetail />
              </div>
            )}
          </div>
        </div>
      </div>

      {showMergeModal && <MergeModal />}
      {showCoordIssuePanel && <CoordIssueModal />}

      <ApiDrawer />
    </div>
  );
}
