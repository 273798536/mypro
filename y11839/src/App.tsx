import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Build from '@/pages/Build';
import Test from '@/pages/Test';
import Review from '@/pages/Review';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/build" element={<Build />} />
        <Route path="/test" element={<Test />} />
        <Route path="/review" element={<Review />} />
      </Routes>
    </Router>
  );
}
