import { Scene3D } from './components/Scene3D/Scene3D';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TimelineControl } from './components/Timeline/TimelineControl';
import { DetailModal } from './components/DetailModal/DetailModal';
import { AnalysisToolbar } from './components/Analysis/AnalysisToolbar';

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-dark">
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1 relative">
          <AnalysisToolbar />
          <Scene3D />
        </div>
      </div>
      <TimelineControl />
      <DetailModal />
    </div>
  );
}

export default App;
