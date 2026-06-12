import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from '@/components/ui/Header';
import Home from '@/pages/Home';
import Review from '@/pages/Review';
import Report from '@/pages/Report';

export default function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/review" element={<Review />} />
          <Route path="/report" element={<Report />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}
