import { MainScene } from '../components/three/MainScene';
import { FilterPanel } from '../components/ui/FilterPanel';
import { AlertPanel } from '../components/ui/AlertPanel';
import { PlaybackControls } from '../components/ui/PlaybackControls';
import { TopBar } from '../components/ui/TopBar';

export default function Home() {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900 overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden pt-14 pb-24">
        <FilterPanel />

        <div className="flex-1 relative">
          <MainScene showStats={false} />
        </div>

        <AlertPanel />
      </div>

      <PlaybackControls />
    </div>
  );
}
