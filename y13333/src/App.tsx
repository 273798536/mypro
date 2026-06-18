import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Samples from './pages/Samples';
import Playback from './pages/Playback';
import Evidence from './pages/Evidence';
import Review from './pages/Review';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="samples" element={<Samples />} />
        <Route path="playback" element={<Playback />} />
        <Route path="evidence/:playbackId" element={<Evidence />} />
        <Route path="review" element={<Review />} />
      </Route>
    </Routes>
  );
}

export default App;
