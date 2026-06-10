import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/Home';
import { CalculationDetailPage } from './pages/CalculationDetail';
import { BatchTrackingPage } from './pages/BatchTracking';
import { ReagentLedgerPage } from './pages/ReagentLedger';
import { SupplementPage } from './pages/SupplementPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/calculation/:id" element={<CalculationDetailPage />} />
        <Route path="/batch-tracking" element={<BatchTrackingPage />} />
        <Route path="/reagent-ledger" element={<ReagentLedgerPage />} />
        <Route path="/reagent-ledger/:id/supplement" element={<SupplementPage />} />
      </Route>
    </Routes>
  );
}

export default App;
