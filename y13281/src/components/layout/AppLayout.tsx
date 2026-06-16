import { Header } from './Header';
import { ParkScene } from '../map3d/ParkScene';
import { TimeSlider } from '../timeline/TimeSlider';
import { FilterBar } from '../filters/FilterBar';
import { MaterialList } from '../materials/MaterialList';
import { SummaryPanel } from '../summary/SummaryPanel';
import { ReviewPanel } from '../review/ReviewPanel';
import { PhotoUploader } from '../photo/PhotoUploader';
import { useAppStore } from '../../store/useAppStore';

export function AppLayout() {
  const { isPhotoUploaderOpen } = useAppStore();

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08), transparent 70%)',
        }}
      />
      <div
        className="absolute top-20 right-0 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08), transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col h-screen">
        <Header />

        <div className="flex-1 flex overflow-hidden">
          <aside className="hidden lg:flex w-80 flex-shrink-0 border-r border-slate-800/50 bg-slate-900/30 backdrop-blur-sm flex-col">
            <div className="px-5 py-4 border-b border-slate-800/50">
              <h2 className="text-white font-bold text-base">材料列表</h2>
              <p className="text-slate-500 text-xs mt-0.5">检查材料与变更记录</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <MaterialList />
            </div>
          </aside>

          <main className="flex-1 flex flex-col min-w-0 relative">
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-4">
              <div className="w-full">
                <TimeSlider />
              </div>
              <div className="w-full max-w-md">
                <FilterBar />
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ParkScene />
            </div>
          </main>

          <aside className="hidden xl:flex w-96 flex-shrink-0 border-l border-slate-800/50 bg-slate-900/30 backdrop-blur-sm flex-col p-4 gap-4">
            <div className="flex-1 min-h-0 overflow-hidden">
              <SummaryPanel />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ReviewPanel />
            </div>
          </aside>
        </div>
      </div>

      {isPhotoUploaderOpen && <PhotoUploader />}
    </div>
  );
}
