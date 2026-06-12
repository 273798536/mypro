import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Records from '@/pages/Records';
import Anomalies from '@/pages/Anomalies';
import Export from '@/pages/Export';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/records" element={<Records />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </Router>
  );
}
