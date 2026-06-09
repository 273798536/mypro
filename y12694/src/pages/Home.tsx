import { ViewpointToolbar } from '@/components/ViewpointToolbar/ViewpointToolbar';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { BrainAtlas3D } from '@/components/BrainAtlas3D/BrainAtlas3D';
import { RecordList } from '@/components/RecordList/RecordList';
import { ReviewBar } from '@/components/ReviewBar/ReviewBar';
import { ExportDialog } from '@/components/ExportDialog/ExportDialog';

const Home = () => {
  return (
    <div className="flex h-screen w-screen flex-col gap-3 overflow-hidden bg-[#050814] p-3">
      <ViewpointToolbar />

      <div className="grid flex-1 min-h-0 grid-cols-12 gap-3">
        <div className="col-span-3 min-h-0">
          <DetailPanel />
        </div>

        <div className="col-span-6 flex min-h-0 flex-col gap-3">
          <div className="flex-1 min-h-0">
            <BrainAtlas3D />
          </div>
          <ReviewBar />
        </div>

        <div className="col-span-3 min-h-0">
          <RecordList />
        </div>
      </div>

      <ExportDialog />
    </div>
  );
};

export default Home;
