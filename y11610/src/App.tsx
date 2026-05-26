import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Toast from './components/ui/Toast';
import Loading from './components/ui/Loading';
import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Matching from './pages/Matching';
import ExchangeLossPage from './pages/ExchangeLoss';
import Rates from './pages/Rates';
import { useUIStore } from './store/useUIStore';

function App() {
  const { sidebarCollapsed, toast, loading } = useUIStore();

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          }`}
        >
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/import" element={<Import />} />
              <Route path="/matching" element={<Matching />} />
              <Route path="/loss" element={<ExchangeLossPage />} />
              <Route path="/rates" element={<Rates />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      {toast && <Toast />}
      {loading && <Loading />}
    </BrowserRouter>
  );
}

export default App;
