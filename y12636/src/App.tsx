import { Routes, Route } from 'react-router-dom';
import Header from './components/Common/Header';
import Sidebar from './components/Common/Sidebar';
import Dashboard from './pages/Dashboard';
import MaterialsPage from './pages/MaterialsPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <div className="w-full h-full flex flex-col bg-port-bg">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
