import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LevelSelect from '@/pages/LevelSelect';
import ParamConsole from '@/pages/ParamConsole';
import ResultReview from '@/pages/ResultReview';
import InstructorReview from '@/pages/InstructorReview';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/level/:id" element={<ParamConsole />} />
        <Route path="/result/:id" element={<ResultReview />} />
        <Route path="/review" element={<InstructorReview />} />
      </Routes>
    </Router>
  );
}
