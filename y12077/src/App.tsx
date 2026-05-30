import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { VersionsPage } from '@/pages/VersionsPage';
import { ConflictsPage } from '@/pages/ConflictsPage';
import { PlaybackPage } from '@/pages/PlaybackPage';
import { Navbar } from '@/components/Navbar';

function Layout() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/playback';

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {showNavbar && <Navbar />}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/versions" element={<VersionsPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/playback" element={<PlaybackPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}
