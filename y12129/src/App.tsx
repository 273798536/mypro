import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';
import Toolbar from './components/Toolbar';
import StatsCards from './components/StatsCards';
import FittingChart from './components/FittingChart';
import ErrorDistribution from './components/ErrorDistribution';
import DataTable from './components/DataTable';
import TraceabilityDrawer from './components/TraceabilityDrawer';
import EmptyState from './components/EmptyState';
import StatusBar from './components/StatusBar';

function DashboardContent() {
  const { state } = useAnalysis();
  const { snapshot } = state;

  if (!snapshot) {
    return (
      <div className="flex flex-col min-h-screen">
        <Toolbar />
        <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
          <EmptyState />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Toolbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-6 w-full">
        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <FittingChart />
          <ErrorDistribution />
        </div>

        <DataTable />
      </main>
      <StatusBar />
      <TraceabilityDrawer />
    </div>
  );
}

function App() {
  return (
    <AnalysisProvider>
      <DashboardContent />
    </AnalysisProvider>
  );
}

export default App;
