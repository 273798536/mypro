import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import RenderView from '@/pages/RenderView';
import ExportReview from '@/pages/ExportReview';

export default function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<RenderView />} />
          <Route path="/export-review" element={<ExportReview />} />
          <Route path="*" element={<RenderView />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
