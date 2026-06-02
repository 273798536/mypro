import { useRef, createContext, useContext } from 'react';
import { Scene3D } from './components/Scene3D/Scene3D';
import { Sidebar, SidebarHandle } from './components/Sidebar/Sidebar';
import { TimelineControl } from './components/Timeline/TimelineControl';
import { DetailModal } from './components/DetailModal/DetailModal';
import { AnalysisToolbar } from './components/Analysis/AnalysisToolbar';

interface ChartRefContextType {
  getChartRef: () => HTMLDivElement | null;
}

const ChartRefContext = createContext<ChartRefContextType | null>(null);

export const useChartRef = () => {
  const context = useContext(ChartRefContext);
  if (!context) {
    throw new Error('useChartRef must be used within a ChartRefProvider');
  }
  return context;
};

function App() {
  const sidebarRef = useRef<SidebarHandle>(null);

  const chartRefContext: ChartRefContextType = {
    getChartRef: () => sidebarRef.current?.getChartRef() || null
  };

  return (
    <ChartRefContext.Provider value={chartRefContext}>
      <div className="w-full h-screen flex flex-col bg-dark">
        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 flex-shrink-0">
            <Sidebar ref={sidebarRef} />
          </div>
          <div className="flex-1 relative">
            <AnalysisToolbar />
            <Scene3D />
          </div>
        </div>
        <TimelineControl />
        <DetailModal />
      </div>
    </ChartRefContext.Provider>
  );
}

export default App;
