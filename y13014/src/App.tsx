import { Routes, Route } from 'react-router-dom';
import WarningHome from '@/pages/WarningHome';
import WarningDetail from '@/pages/WarningDetail';

function App() {
  return (
    <Routes>
      <Route path="/" element={<WarningHome />} />
      <Route path="/warning/:id" element={<WarningDetail />} />
    </Routes>
  );
}

export default App;
