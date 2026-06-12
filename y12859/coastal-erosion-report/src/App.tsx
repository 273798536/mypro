import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ErosionCalculator from './components/ErosionCalculator';
import BuoyDataPanel from './components/BuoyDataPanel';
import WaterQualityPanel from './components/WaterQualityPanel';
import AquacultureLogsPanel from './components/AquacultureLogsPanel';
import DriftInterceptionPanel from './components/DriftInterceptionPanel';
import ReportExportPanel from './components/ReportExportPanel';
import type { ReportTab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<ReportTab>('calculator');

  const renderContent = () => {
    switch (activeTab) {
      case 'calculator':
        return <ErosionCalculator />;
      case 'buoy-data':
        return <BuoyDataPanel />;
      case 'water-quality':
        return <WaterQualityPanel />;
      case 'aquaculture-logs':
        return <AquacultureLogsPanel />;
      case 'drift-interception':
        return <DriftInterceptionPanel />;
      case 'report-export':
        return <ReportExportPanel />;
      default:
        return <ErosionCalculator />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
