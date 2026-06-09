import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import History from '@/pages/History';
import StudentView from '@/pages/StudentView';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student" element={<StudentView />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </Router>
  );
}
