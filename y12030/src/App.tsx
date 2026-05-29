import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { VestingListPage } from './pages/VestingListPage';
import { VestingDetailPage } from './pages/VestingDetailPage';
import { ExercisePage } from './pages/ExercisePage';
import { HistoryPage } from './pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<VestingListPage />} />
              <Route path="/vesting/:employeeId" element={<VestingDetailPage />} />
              <Route path="/exercises" element={<ExercisePage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
