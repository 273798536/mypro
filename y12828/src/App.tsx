import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import LineagePage from '@/pages/LineagePage';
import DuplicatesPage from '@/pages/DuplicatesPage';
import TracePage from '@/pages/TracePage';
import ReviewPage from '@/pages/ReviewPage';
import ImportPage from '@/pages/ImportPage';
import AIStationPage from '@/pages/AIStationPage';
import { useSampleStore } from '@/stores/sampleStore';

export default function App() {
  const { initializeData, versions } = useSampleStore();

  useEffect(() => {
    if (versions.length === 0) {
      initializeData();
    }
  }, [versions.length, initializeData]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/lineage" element={<LineagePage />} />
          <Route path="/duplicates" element={<DuplicatesPage />} />
          <Route path="/trace" element={<TracePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/ai-station" element={<AIStationPage />} />
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center h-64">
                <h2 className="text-2xl font-bold text-lab-text mb-2">页面不存在</h2>
                <p className="text-lab-textMuted">请检查URL是否正确</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
