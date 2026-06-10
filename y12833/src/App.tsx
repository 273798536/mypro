import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import LineagePage from '@/pages/LineagePage';
import SequencingPage from '@/pages/SequencingPage';
import SamplingMapPage from '@/pages/SamplingMapPage';
import PathologyPage from '@/pages/PathologyPage';
import AnnotationReviewPage from '@/pages/AnnotationReviewPage';
import ImportTestPage from '@/pages/ImportTestPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/lineage" replace />} />
          <Route path="lineage" element={<LineagePage />} />
          <Route path="sequencing" element={<SequencingPage />} />
          <Route path="sampling-map" element={<SamplingMapPage />} />
          <Route path="pathology" element={<PathologyPage />} />
          <Route path="annotation-review" element={<AnnotationReviewPage />} />
          <Route path="import-test" element={<ImportTestPage />} />
          <Route path="*" element={<Navigate to="/lineage" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
