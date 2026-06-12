import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PageSummary } from './components/PageSummary';
import { Scene3D } from './components/Scene3D';
import { MaintenanceNotesPanel } from './components/MaintenanceNotesPanel';
import { CalculationResultPanel } from './components/CalculationResultPanel';
import { Timeline } from './components/Timeline';
import { useAppStore } from './store/useAppStore';
import { useEffect } from 'react';

function Workspace() {
  const { notes, loadExampleData } = useAppStore();

  useEffect(() => {
    if (notes.length === 0) {
      loadExampleData();
    }
  }, [notes.length, loadExampleData]);

  return (
    <div className="h-screen w-screen flex flex-col bg-lab-bg overflow-hidden">
      <PageSummary />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex-shrink-0">
          <MaintenanceNotesPanel />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <Scene3D />
          </div>
        </div>
        
        <div className="w-96 flex-shrink-0">
          <CalculationResultPanel />
        </div>
      </div>
      
      <Timeline />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
      </Routes>
    </Router>
  );
}

export default App;
