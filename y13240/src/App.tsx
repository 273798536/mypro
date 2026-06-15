import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExportPage from './pages/ExportPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </div>
  );
}

export default App;
