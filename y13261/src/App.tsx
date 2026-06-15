import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import ReviewList from '@/pages/ReviewList';
import ReviewDetail from '@/pages/ReviewDetail';
import HandoverBoard from '@/pages/HandoverBoard';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-steel-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<ReviewList />} />
          <Route path="/review/:id" element={<ReviewDetail />} />
          <Route path="/handover" element={<HandoverBoard />} />
        </Routes>
      </div>
    </Router>
  );
}
