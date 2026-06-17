import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components';
import DashboardPage from '@/pages/dashboard';
import TracksPage from '@/pages/tracks';
import TrackDetailPage from '@/pages/track-detail';
import UploadPage from '@/pages/upload';
import ExportPage from '@/pages/export';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/tracks" element={<TracksPage />} />
        <Route path="/tracks/:id" element={<TrackDetailPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Route>
    </Routes>
  );
};

export default App;
