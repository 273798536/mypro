import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import RecordList from './pages/RecordList';
import RecordDetail from './pages/RecordDetail';
import SampleCenter from './pages/SampleCenter';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-paper">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 min-h-[calc(100vh-73px)] overflow-y-auto scrollbar-thin">
            <Routes>
              <Route path="/" element={<RecordList />} />
              <Route path="/record/:id" element={<RecordDetail />} />
              <Route path="/samples" element={<SampleCenter />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
