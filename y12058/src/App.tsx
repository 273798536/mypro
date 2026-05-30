import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GamePage } from '@/pages/GamePage';
import { ResultPage } from '@/pages/ResultPage';
import { AuditPage } from '@/pages/AuditPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </Router>
  );
}

export default App;
