import { Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import SampleDetailPage from '@/pages/SampleDetailPage';
import AnomalyPage from '@/pages/AnomalyPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/sample/:id" element={<SampleDetailPage />} />
      <Route path="/anomaly" element={<AnomalyPage />} />
    </Routes>
  );
}

export default App;
