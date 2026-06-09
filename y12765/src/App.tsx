import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workbench from '@/pages/Workbench';
import Review from '@/pages/Review';
import Result from '@/pages/Result';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workbench />} />
        <Route path="/review" element={<Review />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </Router>
  );
}
