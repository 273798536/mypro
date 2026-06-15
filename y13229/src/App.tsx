import { Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import AlignHome from '@/pages/AlignHome';
import TrackVersions from '@/pages/TrackVersions';
import Traceability from '@/pages/Traceability';
import HistoryReview from '@/pages/HistoryReview';
import QuickStart from '@/pages/QuickStart';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<AlignHome />} />
        <Route path="versions" element={<TrackVersions />} />
        <Route path="traceability" element={<Traceability />} />
        <Route path="history" element={<HistoryReview />} />
        <Route path="quickstart" element={<QuickStart />} />
      </Route>
    </Routes>
  );
}
