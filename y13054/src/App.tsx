import { Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import OverviewPage from '@/pages/OverviewPage';
import PointDetailPage from '@/pages/PointDetailPage';
import AnalysisPage from '@/pages/AnalysisPage';

function App() {
  return (
    <div className="min-h-screen bg-sea-mist flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/point/:id" element={<PointDetailPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
