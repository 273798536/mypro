import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Home from '@/pages/Home';
import History from '@/pages/History';
import Export from '@/pages/Export';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
