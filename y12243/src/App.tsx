import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MissionDesk from '@/pages/MissionDesk';
import Review from '@/pages/Review';
import DataManagement from '@/pages/DataManagement';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MissionDesk />} />
        <Route path="/review/:missionId" element={<Review />} />
        <Route path="/data" element={<DataManagement />} />
      </Routes>
    </Router>
  );
}
