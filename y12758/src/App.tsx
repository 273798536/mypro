import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Home from '@/pages/Home';
import Records from '@/pages/Records';
import Results from '@/pages/Results';
import Retest from '@/pages/Retest';
import History from '@/pages/History';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/records" element={<Records />} />
          <Route path="/results" element={<Results />} />
          <Route path="/retest" element={<Retest />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </Router>
  );
}
