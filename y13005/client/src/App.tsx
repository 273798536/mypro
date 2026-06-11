import { Routes, Route, NavLink } from 'react-router-dom';
import BatchesPage from './pages/BatchesPage';
import BatchDetailPage from './pages/BatchDetailPage';
import AnomaliesPage from './pages/AnomaliesPage';

export default function App() {
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <h1>ABS现金流复核</h1>
        <nav>
          <NavLink to="/" end>批次列表</NavLink>
          <NavLink to="/anomalies">币种异常隔离区</NavLink>
        </nav>
      </aside>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BatchesPage />} />
          <Route path="/batches/:id" element={<BatchDetailPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
        </Routes>
      </main>
    </div>
  );
}
